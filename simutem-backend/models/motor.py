"""
Traction Motor Model - Efficiency-based.

Based on Elinta Motors EPM.31.100.HS-SEV PMSM + SiC inverter.

Spec-sheet approach:
  - Torque limited by T_max (peak) and P_rated (continuous power)
  - Power flow uses rated efficiency η_rated
  - Regen limited by P_regen_max

Motoring:   P_elec = P_mech / η_rated
Generating: P_elec = -|P_mech| × η_rated

Motor torque-speed characteristic:
  - Constant torque region: T_max up to base speed
  - Constant power region:  P_rated / ω above base speed
"""

import numpy as np


class PMDCMotor:
    """Efficiency-based traction motor model (PMSM + inverter)."""

    def __init__(self, params=None):
        p = params or {}

        # Ratings (Elinta EPM.31.100.HS-SEV defaults)
        self.P_rated = p.get('P_rated', 125000)       # Continuous power [W]
        self.T_max = p.get('T_max', 1700)              # Peak torque [Nm]
        self.T_rated = p.get('T_rated', 600)            # Continuous torque [Nm]
        self.P_regen_max = p.get('P_regen_max', 100000) # Max regen power [W]

        # Efficiency (from motor spec sheet: 94.5%)
        self.eta_rated = p.get('eta_rated', 0.945)

        # Bus voltage range (for estimation / logging)
        self.V_bus_nom = p.get('V_bus_nom', 730)        # Nominal DC bus voltage [V]

        # State
        self.I_a = 0.0

    def torque_limit(self, omega):
        """
        Maximum available torque at given speed [Nm].
        Constant torque up to base speed, then constant power.
        """
        T_limit = self.T_max
        if abs(omega) > 1e-6:
            T_power_limit = self.P_rated / abs(omega)
            T_limit = min(T_limit, T_power_limit)
        return T_limit

    def compute_step(self, T_demand, omega, dt):
        """
        Compute motor state for one time step using efficiency model.

        Parameters:
            T_demand: Demanded torque [Nm] (+ motoring, - regen)
            omega: Motor speed [rad/s]
            dt: Time step [s]

        Returns dict with motor outputs.
        """
        # Limit torque to motor capability
        T_limit = self.torque_limit(omega)
        T_actual = np.clip(T_demand, -T_limit, T_limit)

        # Mechanical power at motor shaft
        P_mech = T_actual * omega

        # Apply regen power limit
        if P_mech < -self.P_regen_max:
            P_mech = -self.P_regen_max
            T_actual = P_mech / omega if abs(omega) > 1e-6 else 0.0

        # Electrical power using efficiency
        if abs(P_mech) < 100:
            # Near-zero power: no significant losses
            P_elec = P_mech
            P_loss = 0.0
            eta = 0.0
        elif P_mech >= 0:
            # Motoring: electrical > mechanical
            P_elec = P_mech / self.eta_rated
            P_loss = P_elec - P_mech
            eta = self.eta_rated
        else:
            # Regenerating: |electrical| < |mechanical|
            P_elec = P_mech * self.eta_rated  # Negative (power returned)
            P_loss = abs(P_mech) - abs(P_elec)
            eta = self.eta_rated

        # Estimated current for logging (P = V × I)
        V_est = max(self.V_bus_nom, 100.0)
        I_est = P_elec / V_est if abs(V_est) > 1e-6 else 0.0

        # Update state
        self.I_a = I_est

        return {
            'T_motor': T_actual,
            'I_a': I_est,
            'V_terminal': V_est,
            'E_emf': 0.0,
            'omega': omega,
            'P_electrical': P_elec,
            'P_mechanical': P_mech,
            'P_loss_copper': P_loss * 0.6,
            'P_loss_iron': P_loss * 0.3,
            'P_loss_mech': P_loss * 0.1,
            'P_loss_total': P_loss,
            'efficiency': eta,
        }

    def get_info(self):
        return {
            'Sürekli güç [kW]': self.P_rated / 1000,
            'Maks tork [Nm]': self.T_max,
            'Sürekli tork [Nm]': self.T_rated,
            'Regen güç limiti [kW]': self.P_regen_max / 1000,
            'Verim [%]': self.eta_rated * 100,
            'Nominal DC bus [V]': self.V_bus_nom,
        }
