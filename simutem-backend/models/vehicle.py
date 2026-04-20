"""
Vehicle Body Dynamics - Bus specific.

Longitudinal dynamics model for electric bus (per Wang et al. EVS28 2015):
  F_traction = F_rolling + F_aero + F_grade + F_inertia

Forces:
  - Rolling resistance: F_roll = f_r(T) * m * g * cos(θ)
  - Aerodynamic drag:   F_aero = 0.5 * ρ(T,P) * Cd * Af * (v - v_wind)²
  - Grade resistance:   F_grade = m * g * sin(θ)
  - Inertia force:      F_inertia = m_eff * a
    where m_eff = m_vehicle * (1 + δ) accounts for rotational inertia

Auxiliary power:
  - P_aux = P_hvac + P_lights + P_compressor + P_steering + P_electronics
  - Directly drawn from battery (not through motor)

Wheel mechanics:
  - T_wheel = F_traction * r_wheel
  - ω_wheel = v / r_wheel
  - T_motor = T_wheel / (gear_ratio * η_transmission)
  - ω_motor = ω_wheel * gear_ratio
"""

import numpy as np


class VehicleBody:
    """Bus vehicle body model."""

    def __init__(self, params=None):
        # Default: 12m electric city bus (similar to TEMSA Avenue Electron)
        p = params or {}

        # Mass parameters
        self.m_curb = p.get('m_curb', 7500.0)           # Curb weight [kg]
        self.m_passengers = p.get('m_passengers', 0.0)   # Passenger mass [kg]
        self.n_passengers = p.get('n_passengers', 0)     # Number of passengers
        self.m_per_passenger = p.get('m_per_passenger', 70.0)  # kg per passenger

        # Aerodynamic parameters
        self.Cd = p.get('Cd', 0.6)           # Drag coefficient [-]
        self.Af = p.get('Af', 5.9)           # Frontal area [m²]
        self.rho_air = p.get('rho_air', 1.225)  # Air density [kg/m³] (auto-calc if auto_rho)
        self.v_wind = p.get('v_wind', 0.0)   # Headwind speed [m/s] (+ = headwind, - = tailwind)

        # Environmental parameters (per EVS28 paper: temp/pressure affect rho and Cr)
        self.T_ambient = p.get('T_ambient', 20.0)   # Ambient temperature [°C]
        self.P_atm = p.get('P_atm', 101325.0)       # Atmospheric pressure [Pa]
        self.auto_rho = p.get('auto_rho', False)     # Auto-calculate rho from T,P

        # Rolling resistance (temperature-dependent per EVS28 coast-down tests)
        self.Cr = p.get('Cr', 0.0068)        # Rolling resistance coefficient [-] at ref temp
        self.Cr_temp_coeff = p.get('Cr_temp_coeff', -0.003)  # Cr change per °C
        self.Cr_ref_temp = p.get('Cr_ref_temp', 20.0)        # Reference temperature for Cr [°C]

        # Auxiliary power (DC/DC 4.3kW + misc)
        self.P_aux = p.get('P_aux', 5000.0)          # Base auxiliary power [W]
        self.P_hvac = p.get('P_hvac', 7000.0)        # HVAC power [W] (Elinta spec: 7kW A/C)
        self.P_aux_total = self.P_aux + self.P_hvac   # Total aux draw from battery [W]

        # Tire/wheel parameters (Praxis: 225/75 R 17.5)
        self.r_wheel = p.get('r_wheel', 0.391)  # Wheel radius [m] (225/75R17.5)

        # Drivetrain
        self.gear_ratio = p.get('gear_ratio', 6.0)          # Total ratio [-] (Elinta 2.85 × axle ~2.1)
        self.eta_transmission = p.get('eta_transmission', 0.95)  # Transmission efficiency [-]
        self.delta_rotational = p.get('delta_rotational', 0.05)  # Rotational mass factor [-]

        # Road grade profile (can be set after init)
        self.grade_angle = p.get('grade_angle', 0.0)  # Constant grade [rad], or array

        # Physical constants
        self.g = 9.81  # Gravitational acceleration [m/s²]

        # Update air density if auto mode
        if self.auto_rho:
            self.rho_air = self.calc_air_density(self.T_ambient, self.P_atm)

    @property
    def m_total(self):
        """Total vehicle mass including passengers."""
        passenger_mass = self.n_passengers * self.m_per_passenger + self.m_passengers
        return self.m_curb + passenger_mass

    @property
    def m_effective(self):
        """Effective mass including rotational inertia."""
        return self.m_total * (1.0 + self.delta_rotational)

    def get_grade(self, distance):
        """Get road grade angle at given distance."""
        if isinstance(self.grade_angle, (int, float)):
            return float(self.grade_angle)
        # If array, interpolate (grade_angle should be (distance, angle) pairs)
        return float(np.interp(distance, self.grade_angle[:, 0], self.grade_angle[:, 1]))

    @staticmethod
    def calc_air_density(T_celsius, P_pa=101325.0, humidity=0.5):
        """
        Air density from temperature and pressure (per EVS28 paper, Fig.4).
        Uses ideal gas law with humidity correction.
        """
        T_kelvin = T_celsius + 273.15
        R_dry = 287.058    # J/(kg·K) specific gas constant for dry air
        R_vapor = 461.495  # J/(kg·K) specific gas constant for water vapor
        # Saturation vapor pressure (Buck equation)
        e_sat = 611.21 * np.exp((18.678 - T_celsius / 234.5) * (T_celsius / (257.14 + T_celsius)))
        e_vapor = humidity * e_sat
        P_dry = P_pa - e_vapor
        rho = P_dry / (R_dry * T_kelvin) + e_vapor / (R_vapor * T_kelvin)
        return rho

    def get_Cr_effective(self):
        """
        Temperature-dependent rolling resistance coefficient.
        Cr decreases with increasing temperature (per EVS28 coast-down tests).
        """
        dT = self.T_ambient - self.Cr_ref_temp
        Cr_eff = self.Cr * (1.0 + self.Cr_temp_coeff * dT)
        return max(0.004, Cr_eff)  # Physical lower bound

    def rolling_resistance(self, v, grade_rad=0.0):
        """
        Rolling resistance force [N].
        F_roll = f_r(T) * m * g * cos(θ)
        """
        Cr = self.get_Cr_effective()
        return self.m_total * self.g * Cr * np.cos(grade_rad)

    def aerodynamic_drag(self, v):
        """
        Aerodynamic drag force [N].
        F_aero = 0.5 * ρ * Cd * Af * (v - v_wind)²
        Per EVS28 paper Eq.1: includes wind speed.
        """
        v_eff = v - self.v_wind  # Effective air speed (headwind increases drag)
        return 0.5 * self.rho_air * self.Cd * self.Af * v_eff * abs(v_eff)

    def grade_force(self, grade_rad=0.0):
        """
        Grade resistance force [N].
        F_grade = m * g * sin(θ)
        Positive uphill, negative downhill.
        """
        return self.m_total * self.g * np.sin(grade_rad)

    def total_road_load(self, v, grade_rad=0.0):
        """
        Total road load force [N] (excluding inertia).
        F_road = F_roll + F_aero + F_grade
        """
        F_roll = self.rolling_resistance(v, grade_rad)
        F_aero = self.aerodynamic_drag(v)
        F_grade = self.grade_force(grade_rad)
        return F_roll + F_aero + F_grade

    def required_traction_force(self, v, a, grade_rad=0.0):
        """
        Total traction force needed at wheels [N].
        F_traction = F_road + m_eff * a
        """
        F_road = self.total_road_load(v, grade_rad)
        F_inertia = self.m_effective * a
        return F_road + F_inertia

    def wheel_torque_from_force(self, F_traction):
        """Convert traction force [N] to wheel torque [Nm]."""
        return F_traction * self.r_wheel

    def motor_torque_from_wheel(self, T_wheel):
        """
        Convert wheel torque to motor torque considering gear ratio and efficiency.
        T_motor = T_wheel / (gear_ratio * η)    for motoring (T_wheel > 0)
        T_motor = T_wheel * η / gear_ratio       for regenerating (T_wheel < 0)
        """
        if T_wheel >= 0:
            return T_wheel / (self.gear_ratio * self.eta_transmission)
        else:
            return T_wheel * self.eta_transmission / self.gear_ratio

    def motor_speed_from_vehicle(self, v):
        """
        Motor angular velocity [rad/s] from vehicle speed [m/s].
        ω_motor = v / r_wheel * gear_ratio
        """
        omega_wheel = v / self.r_wheel
        return omega_wheel * self.gear_ratio

    def vehicle_speed_from_motor(self, omega_motor):
        """Vehicle speed [m/s] from motor angular velocity [rad/s]."""
        omega_wheel = omega_motor / self.gear_ratio
        return omega_wheel * self.r_wheel

    def acceleration_from_force(self, F_net):
        """
        Vehicle acceleration from net force.
        a = F_net / m_effective
        """
        return F_net / self.m_effective

    def power_at_wheels(self, F_traction, v):
        """Power at wheels [W]."""
        return F_traction * v

    def energy_per_km(self, total_energy_wh, total_distance_m):
        """Energy consumption [Wh/km]."""
        if total_distance_m <= 0:
            return 0.0
        return total_energy_wh / (total_distance_m / 1000.0)

    def get_info(self):
        """Return summary dict of vehicle parameters."""
        return {
            'Total mass [kg]': self.m_total,
            'Effective mass [kg]': self.m_effective,
            'Cd [-]': self.Cd,
            'Frontal area [m²]': self.Af,
            'Cr [-]': self.Cr,
            'Cr effective [-]': self.get_Cr_effective(),
            'ρ_air [kg/m³]': self.rho_air,
            'Wind speed [m/s]': self.v_wind,
            'T_ambient [°C]': self.T_ambient,
            'Wheel radius [m]': self.r_wheel,
            'Gear ratio [-]': self.gear_ratio,
            'Transmission eff [-]': self.eta_transmission,
            'P_aux total [W]': self.P_aux_total,
        }
