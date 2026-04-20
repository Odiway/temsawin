"""
H-Bridge Power Converter with Regenerative Braking.

The H-Bridge controls current flow direction to the PMDC motor:
  - Motoring mode: Battery → H-Bridge → Motor (power flows to wheels)
  - Regenerative braking: Motor → H-Bridge → Battery (energy recovery)

PWM duty cycle determines average voltage applied to motor:
  V_motor = D * V_battery  (motoring, 0 ≤ D ≤ 1)

Losses:
  - Conduction loss: P_cond = V_ce_sat * I + R_on * I²
  - Switching loss:  P_sw = f_sw * (E_on + E_off) * I / I_rated
  - Total converter efficiency: η = P_out / P_in

Regenerative braking:
  - During braking, motor acts as generator
  - H-Bridge operates as boost converter to charge battery
  - Regen efficiency accounts for converter + motor generating losses
"""

import numpy as np


class HBridgeConverter:
    """H-Bridge power converter with regenerative braking capability."""

    def __init__(self, params=None):
        p = params or {}

        # IGBT/MOSFET parameters
        self.V_ce_sat = p.get('V_ce_sat', 1.5)     # On-state voltage drop [V]
        self.R_on = p.get('R_on', 0.005)            # On-state resistance [Ω]

        # Switching parameters
        self.f_sw = p.get('f_sw', 10000)             # Switching frequency [Hz]
        self.E_on = p.get('E_on', 0.005)             # Turn-on energy [J] at rated current
        self.E_off = p.get('E_off', 0.003)           # Turn-off energy [J] at rated current
        self.I_rated_sw = p.get('I_rated_sw', 600)   # Rated current for switching loss [A]

        # Diode parameters (for freewheeling)
        self.V_diode = p.get('V_diode', 1.2)        # Diode forward voltage [V]
        self.R_diode = p.get('R_diode', 0.003)      # Diode on resistance [Ω]

        # Efficiency parameters (simplified)
        self.eta_motoring = p.get('eta_motoring', 0.98)   # SiC inverter motoring efficiency [-]
        self.eta_regen = p.get('eta_regen', 0.95)         # Regen braking efficiency [-]

        # Regen braking parameters
        self.regen_fraction = p.get('regen_fraction', 0.80)  # Max fraction of braking via regen [-]
        self.v_min_regen = p.get('v_min_regen', 1.5)        # Min speed for regen [m/s] (~5 km/h)

        # Ratings
        self.I_max = p.get('I_max', 700)             # Max output current [A]
        self.V_max = p.get('V_max', 750)              # Max bus voltage [V]

        # State
        self.duty_cycle = 0.0

    def conduction_loss(self, I_out):
        """Conduction loss in H-Bridge [W]. Two devices conduct at any time."""
        I_abs = abs(I_out)
        # Two switches (or switch + diode) in path
        P_switch = self.V_ce_sat * I_abs + self.R_on * I_abs ** 2
        P_diode = self.V_diode * I_abs + self.R_diode * I_abs ** 2
        return P_switch + P_diode

    def switching_loss(self, I_out):
        """Switching loss [W]."""
        I_abs = abs(I_out)
        if self.I_rated_sw > 0:
            P_sw = self.f_sw * (self.E_on + self.E_off) * (I_abs / self.I_rated_sw)
        else:
            P_sw = 0.0
        return P_sw

    def total_loss(self, I_out):
        """Total converter loss [W]."""
        return self.conduction_loss(I_out) + self.switching_loss(I_out)

    def compute_duty_cycle(self, V_motor_required, V_battery):
        """
        Compute PWM duty cycle.
        D = V_motor / V_battery (clipped to [0, 1])
        """
        if V_battery <= 0:
            return 0.0
        D = V_motor_required / V_battery
        return np.clip(D, -1.0, 1.0)

    def compute_step(self, P_motor_demand, V_battery, I_motor, v_vehicle, is_braking):
        """
        Compute converter operation for one time step.

        Parameters:
            P_motor_demand: Motor electrical power demand [W] (+ motoring, - braking)
            V_battery: Battery terminal voltage [V]
            I_motor: Motor current [A]
            v_vehicle: Vehicle speed [m/s]
            is_braking: Whether driver is requesting braking

        Returns dict with converter outputs.
        """
        I_abs = abs(I_motor)

        if not is_braking or P_motor_demand >= 0:
            # MOTORING MODE
            P_loss = self.total_loss(I_motor)
            eta = self.eta_motoring

            # Power drawn from battery
            if eta > 0:
                P_battery = P_motor_demand / eta + P_loss
            else:
                P_battery = P_motor_demand + P_loss

            # Battery current (positive = discharging)
            I_battery = P_battery / V_battery if V_battery > 0 else 0.0

            mode = 'motoring'
            P_regen = 0.0

        else:
            # REGENERATIVE BRAKING MODE
            P_braking = abs(P_motor_demand)  # Total braking power available

            # Check if regen is possible (speed must be above threshold)
            if abs(v_vehicle) < self.v_min_regen:
                # Below min speed: only mechanical braking
                P_regen = 0.0
                P_loss = 0.0
                P_battery = 0.0
                I_battery = 0.0
                mode = 'mechanical_brake'
            else:
                # Regen captures fraction of braking energy
                P_regen_gross = P_braking * self.regen_fraction
                P_loss = self.total_loss(I_motor)

                # Net power returned to battery
                P_regen = P_regen_gross * self.eta_regen - P_loss
                P_regen = max(0.0, P_regen)

                # Battery current (negative = charging)
                P_battery = -P_regen
                I_battery = P_battery / V_battery if V_battery > 0 else 0.0

                mode = 'regenerative'

        # Duty cycle
        V_motor_req = abs(I_motor) * 0.05 + abs(I_motor) * self.Ke_approx(I_motor) if I_abs > 0 else 0
        D = self.compute_duty_cycle(abs(P_motor_demand / max(I_abs, 1e-6)), V_battery)

        return {
            'mode': mode,
            'duty_cycle': D,
            'P_battery': P_battery,       # Battery power [W] (+ discharge, - charge)
            'I_battery': I_battery,       # Battery current [A] (+ discharge, - charge)
            'P_loss_converter': self.total_loss(I_motor),
            'P_regen': P_regen if is_braking else 0.0,
            'eta_converter': self.eta_motoring if not is_braking else self.eta_regen,
        }

    def Ke_approx(self, I):
        """Rough back-EMF per current estimate for duty cycle calc."""
        return 0.01  # placeholder, actual duty cycle computed from motor model

    def get_info(self):
        return {
            'Switching freq [Hz]': self.f_sw,
            'Motoring efficiency [-]': self.eta_motoring,
            'Regen efficiency [-]': self.eta_regen,
            'Regen fraction [-]': self.regen_fraction,
            'Min regen speed [m/s]': self.v_min_regen,
            'Max current [A]': self.I_max,
        }
