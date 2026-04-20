"""
SiMUTEM - Simulation Engine.

Main simulation loop that integrates all subsystem models:
  Drive Cycle → Driver Controller → Power Converter → Motor → Vehicle Body
                                         ↑
                                      Battery

Time-domain simulation with fixed time step (Euler integration)
or variable step (RK4) for higher accuracy.

Signal flow each time step:
  1. Interpolate reference speed from drive cycle
  2. Driver PID computes throttle/brake command
  3. Convert command to motor torque demand
  4. Motor model computes electrical quantities
  5. Power converter handles power flow direction
  6. Battery supplies/absorbs energy, updates SOC
  7. Vehicle dynamics computes acceleration and new speed
  8. Log all signals
"""

import numpy as np
from models.drive_cycle import get_cycle
from models.vehicle import VehicleBody
from models.motor import PMDCMotor
from models.power_converter import HBridgeConverter
from models.battery import Battery
from models.driver_controller import DriverController


class SimulationResults:
    """Container for simulation output data."""

    def __init__(self):
        self.time = []
        self.v_reference = []
        self.v_actual = []
        self.acceleration = []
        self.distance = []

        self.driver_command = []

        self.F_traction = []
        self.F_rolling = []
        self.F_aero = []
        self.F_grade = []

        self.T_motor = []
        self.omega_motor = []
        self.I_motor = []
        self.V_motor = []
        self.P_motor_elec = []
        self.P_motor_mech = []
        self.eta_motor = []

        self.converter_mode = []
        self.P_converter_loss = []
        self.P_regen = []

        self.SOC = []
        self.V_battery = []
        self.I_battery = []
        self.P_battery = []
        self.T_battery = []

        self.P_total_loss = []
        self.E_consumed_Wh = []
        self.E_regen_Wh = []
        self.P_aux = []
        self.E_aux_Wh = []

    def to_dict(self):
        """Convert to dict of numpy arrays."""
        d = {}
        for key, val in self.__dict__.items():
            if isinstance(val, list):
                d[key] = np.array(val)
        return d


class Simulator:
    """Main simulation engine."""

    def __init__(self, vehicle_params=None, motor_params=None,
                 converter_params=None, battery_params=None,
                 controller_params=None):

        self.vehicle = VehicleBody(vehicle_params)
        self.motor = PMDCMotor(motor_params)
        self.converter = HBridgeConverter(converter_params)
        self.battery = Battery(battery_params)
        self.controller = DriverController(controller_params)

    def run(self, cycle_name='SORT1', csv_path=None, dt=0.01,
            progress_callback=None):
        """
        Run the full simulation.

        Parameters:
            cycle_name: Drive cycle name
            csv_path: Path to custom CSV (if cycle_name='CUSTOM')
            dt: Time step [s] (0.01 = 10ms, good balance of speed/accuracy)
            progress_callback: Optional callable(progress_fraction) for GUI

        Returns:
            SimulationResults object
        """
        # Load drive cycle
        t_cycle, v_cycle = get_cycle(cycle_name, csv_path)

        # Create uniform time array
        t_end = t_cycle[-1]
        time_array = np.arange(0, t_end, dt)
        n_steps = len(time_array)

        # Interpolate reference speed onto uniform time grid
        v_ref_interp = np.interp(time_array, t_cycle, v_cycle)

        # Reset models
        self.battery.reset()
        self.controller.reset()
        self.motor.I_a = 0.0

        # Initialize state
        v_actual = 0.0
        distance = 0.0

        # Results container
        res = SimulationResults()

        # Accumulated energy (for integration)
        E_consumed_cumulative = 0.0
        E_regen_cumulative = 0.0
        E_aux_cumulative = 0.0

        for i in range(n_steps):
            t = time_array[i]
            v_ref = v_ref_interp[i]

            # 1. Driver controller
            command, is_braking = self.controller.compute(v_ref, v_actual, dt)

            # 2. Compute road grade at current distance
            grade_rad = self.vehicle.get_grade(distance)

            # 3. Compute road load forces
            F_roll = self.vehicle.rolling_resistance(v_actual, grade_rad)
            F_aero = self.vehicle.aerodynamic_drag(v_actual)
            F_grade = self.vehicle.grade_force(grade_rad)
            F_road = F_roll + F_aero + F_grade

            # 4. Convert driver command to torque demand
            if not is_braking:
                # Throttle: map [0, 1] → [0, T_max] considering speed
                omega_motor = self.vehicle.motor_speed_from_vehicle(max(v_actual, 0))
                T_max_available = self.motor.torque_limit(omega_motor)
                T_demand_motor = command * T_max_available
            else:
                # Braking: map [-1, 0] → [-T_max, 0]
                omega_motor = self.vehicle.motor_speed_from_vehicle(max(v_actual, 0))
                T_max_available = self.motor.torque_limit(omega_motor)
                T_demand_motor = command * T_max_available  # command is negative

            # 5. Motor computes actual outputs
            omega_motor = self.vehicle.motor_speed_from_vehicle(max(v_actual, 0))
            motor_out = self.motor.compute_step(T_demand_motor, omega_motor, dt)

            # 6. Power converter processes power flow
            P_motor_elec = motor_out['P_electrical']
            V_batt = self.battery.V_ocv_pack()

            conv_out = self.converter.compute_step(
                P_motor_elec, V_batt, motor_out['I_a'], v_actual, is_braking
            )

            # 7. Battery supplies/absorbs power (traction + auxiliary per EVS28 paper)
            P_aux = self.vehicle.P_aux_total
            P_battery_demand = conv_out['P_battery'] + P_aux  # Aux drawn directly from battery
            batt_out = self.battery.compute_step(P_battery_demand, dt)

            # 8. Compute net traction force at wheels
            T_wheel = motor_out['T_motor'] * self.vehicle.gear_ratio * self.vehicle.eta_transmission
            F_traction = T_wheel / self.vehicle.r_wheel

            # For braking, add mechanical brake if needed
            if is_braking:
                F_brake_needed = abs(command) * self.vehicle.m_total * 3.0  # up to ~3 m/s² decel
                F_motor_brake = abs(F_traction)
                if F_brake_needed > F_motor_brake:
                    F_mech_brake = F_brake_needed - F_motor_brake
                else:
                    F_mech_brake = 0.0
                F_traction = -F_motor_brake - F_mech_brake

            # 9. Net force and acceleration
            F_net = F_traction - F_road
            a = self.vehicle.acceleration_from_force(F_net)

            # 10. Integrate velocity and distance (Euler)
            v_new = v_actual + a * dt
            v_new = max(v_new, 0.0)  # Bus can't go backwards
            distance += 0.5 * (v_actual + v_new) * dt  # Trapezoidal

            # Energy accounting
            P_consumed = max(0, batt_out['P_actual'])
            P_regen = conv_out.get('P_regen', 0.0)
            E_consumed_cumulative += P_consumed * dt / 3600  # Wh
            E_regen_cumulative += P_regen * dt / 3600
            E_aux_cumulative += P_aux * dt / 3600  # Wh

            # Total losses
            P_total_loss = (motor_out['P_loss_total'] +
                            conv_out['P_loss_converter'] +
                            batt_out['P_loss'])

            # Log results
            res.time.append(t)
            res.v_reference.append(v_ref)
            res.v_actual.append(v_new)
            res.acceleration.append(a)
            res.distance.append(distance)

            res.driver_command.append(command)

            res.F_traction.append(F_traction)
            res.F_rolling.append(F_roll)
            res.F_aero.append(F_aero)
            res.F_grade.append(F_grade)

            res.T_motor.append(motor_out['T_motor'])
            res.omega_motor.append(omega_motor)
            res.I_motor.append(motor_out['I_a'])
            res.V_motor.append(motor_out['V_terminal'])
            res.P_motor_elec.append(motor_out['P_electrical'])
            res.P_motor_mech.append(motor_out['P_mechanical'])
            res.eta_motor.append(motor_out['efficiency'])

            res.converter_mode.append(conv_out['mode'])
            res.P_converter_loss.append(conv_out['P_loss_converter'])
            res.P_regen.append(P_regen)

            res.SOC.append(batt_out['SOC'])
            res.V_battery.append(batt_out['V_terminal'])
            res.I_battery.append(batt_out['I_pack'])
            res.P_battery.append(batt_out['P_actual'])
            res.T_battery.append(batt_out['T_battery'])

            res.P_total_loss.append(P_total_loss)
            res.E_consumed_Wh.append(E_consumed_cumulative)
            res.E_regen_Wh.append(E_regen_cumulative)
            res.P_aux.append(P_aux)
            res.E_aux_Wh.append(E_aux_cumulative)

            # Update state
            v_actual = v_new

            # Progress callback (every 1%)
            if progress_callback and i % max(1, n_steps // 100) == 0:
                progress_callback(i / n_steps)

        if progress_callback:
            progress_callback(1.0)

        return res

    def compute_summary(self, results):
        """Compute summary statistics from simulation results."""
        d = results.to_dict()
        total_time = d['time'][-1] - d['time'][0]
        total_distance_m = d['distance'][-1]
        total_distance_km = total_distance_m / 1000

        E_consumed = d['E_consumed_Wh'][-1]
        E_regen = d['E_regen_Wh'][-1]
        E_aux = d['E_aux_Wh'][-1]
        E_net = E_consumed - E_regen

        SOC_start = d['SOC'][0]
        SOC_end = d['SOC'][-1]

        v_avg = total_distance_m / total_time if total_time > 0 else 0
        v_max = np.max(d['v_actual'])

        # Energy consumption per km
        if total_distance_km > 0:
            Wh_per_km = E_net / total_distance_km
            kWh_per_100km = Wh_per_km / 10
        else:
            Wh_per_km = 0
            kWh_per_100km = 0

        # Average motor efficiency (only when motoring)
        motoring_mask = np.array(d['eta_motor']) > 0.01
        eta_motor_avg = np.mean(d['eta_motor'][motoring_mask]) if np.any(motoring_mask) else 0

        # Regen ratio
        regen_ratio = E_regen / E_consumed if E_consumed > 0 else 0

        # Range calculations
        E_pack = self.battery.E_pack_kWh  # Total battery energy [kWh]
        SOC_min = self.battery.SOC_min
        SOC_max = self.battery.SOC_max

        if Wh_per_km > 0:
            # Remaining range (from current SOC to SOC_min)
            E_remaining = (SOC_end - SOC_min) * E_pack  # kWh
            range_remaining = E_remaining * 1000 / Wh_per_km

            # Usable range (SOC window: SOC_max → SOC_min)
            E_usable = (SOC_max - SOC_min) * E_pack  # kWh
            range_usable = E_usable * 1000 / Wh_per_km

            # Full capacity range (100% → 0%)
            range_full = E_pack * 1000 / Wh_per_km
        else:
            range_remaining = 0
            range_usable = 0
            range_full = 0

        return {
            'Total time [s]': round(total_time, 1),
            'Total distance [km]': round(total_distance_km, 2),
            'Average speed [km/h]': round(v_avg * 3.6, 1),
            'Max speed [km/h]': round(v_max * 3.6, 1),
            'Energy consumed [Wh]': round(E_consumed, 1),
            'Energy regenerated [Wh]': round(E_regen, 1),
            'Energy auxiliary [Wh]': round(E_aux, 1),
            'Net energy [Wh]': round(E_net, 1),
            'Consumption [Wh/km]': round(Wh_per_km, 1),
            'Consumption [kWh/100km]': round(kWh_per_100km, 1),
            'SOC start [-]': round(SOC_start, 4),
            'SOC end [-]': round(SOC_end, 4),
            'SOC used [%]': round((SOC_start - SOC_end) * 100, 2),
            'Avg motor efficiency [%]': round(eta_motor_avg * 100, 1),
            'Regen ratio [%]': round(regen_ratio * 100, 1),
            'Remaining range [km]': round(range_remaining, 1),
            f'Usable range ({SOC_min*100:.0f}%-{SOC_max*100:.0f}%) [km]': round(range_usable, 1),
            'Full capacity range (0%-100%) [km]': round(range_full, 1),
            'Battery temp [°C]': round(d['T_battery'][-1], 1),
        }
