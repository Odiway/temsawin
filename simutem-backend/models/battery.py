"""
Battery Model - Pack-based with NMC/LFP chemistry support.

Based on Elinta Motors ESS7A.360.42 battery system specs.
User defines individual pack parameters + series/parallel pack count.

Example: Elinta EV-200 drivetrain
  - 4 packs: ESS7A.360.42 (365V, 117Ah, 42 kWh each, NMC)
  - Config: 2S2P → System: 730V, 234Ah, 168 kWh
  - Each pack: 16 modules × 6 cells = 96 cells

Equivalent circuit model (Rint model):
  V_terminal = V_OCV(SOC) - I * R_system

SOC dynamics:
  dSOC/dt = -I / (Q_system * 3600)

Thermal model (simplified lumped):
  dT/dt = (P_loss - h*A*(T - T_amb)) / (m_batt * Cp)
"""

import numpy as np


class Battery:
    """Pack-based lithium-ion battery system model."""

    # Cell chemistry definitions
    CHEMISTRY = {
        'NMC': {'V_nom': 3.8, 'V_max': 4.2, 'V_min': 2.7},
        'LFP': {'V_nom': 3.2, 'V_max': 3.65, 'V_min': 2.5},
    }

    def __init__(self, params=None):
        p = params or {}

        # ── Pack-level configuration ──
        self.V_pack_nom = p.get('V_pack_nom', 365.0)     # Single pack nominal voltage [V]
        self.Q_pack_Ah_single = p.get('Q_pack_Ah', 117.0)  # Single pack capacity [Ah]
        self.R_pack_single = p.get('R_pack', 0.078)       # Single pack internal resistance [Ω]
        self.n_packs_series = p.get('n_packs_series', 2)   # Packs in series
        self.n_packs_parallel = p.get('n_packs_parallel', 2)  # Packs in parallel

        # Chemistry
        self.chemistry = p.get('chemistry', 'NMC')
        chem = self.CHEMISTRY.get(self.chemistry, self.CHEMISTRY['NMC'])
        self._V_cell_nom = chem['V_nom']
        self._V_cell_max = chem['V_max']
        self._V_cell_min = chem['V_min']

        # Derived: cells per pack
        self._cells_per_pack = round(self.V_pack_nom / self._V_cell_nom)

        # SOC parameters (Elinta recommended: 20-90%)
        self.SOC_init = p.get('SOC_init', 0.90)
        self.SOC_min = p.get('SOC_min', 0.20)
        self.SOC_max = p.get('SOC_max', 0.90)

        # Current limits (system level)
        self.I_max_discharge = p.get('I_max_discharge',
                                     400.0 * self.n_packs_parallel)  # 400A per pack
        self.I_max_charge = p.get('I_max_charge',
                                  250.0 * self.n_packs_parallel)     # 250A per pack

        # Thermal parameters
        self.T_batt = p.get('T_init', 25.0)
        self.m_batt = p.get('m_batt', 968.0)    # 4 packs × 242 kg
        self.Cp_batt = p.get('Cp_batt', 1000.0)
        self.h_conv = p.get('h_conv', 15.0)      # Liquid cooled → higher h
        self.A_surface = p.get('A_surface', 4.0)
        self.T_ambient = p.get('T_ambient', 25.0)

        # State
        self.SOC = self.SOC_init
        self.energy_discharged_Wh = 0.0
        self.energy_charged_Wh = 0.0
        self.total_energy_loss_Wh = 0.0

    @property
    def n_total_packs(self):
        """Total number of battery packs."""
        return self.n_packs_series * self.n_packs_parallel

    @property
    def Q_pack_Ah(self):
        """System effective capacity [Ah] (parallel increases capacity)."""
        return self.Q_pack_Ah_single * self.n_packs_parallel

    @property
    def V_pack_nominal(self):
        """System nominal voltage [V] (series increases voltage)."""
        return self.V_pack_nom * self.n_packs_series

    @property
    def E_pack_kWh(self):
        """Total system energy [kWh]."""
        return self.V_pack_nominal * self.Q_pack_Ah / 1000.0

    @property
    def R_pack(self):
        """System internal resistance [Ω]."""
        return self.R_pack_single * self.n_packs_series / self.n_packs_parallel

    @property
    def _n_series_cells(self):
        """Total series cells across all series packs."""
        return self._cells_per_pack * self.n_packs_series

    def V_ocv_cell(self, soc):
        """Open-circuit voltage per cell as function of SOC."""
        soc = np.clip(soc, 0.0, 1.0)

        if self.chemistry == 'NMC':
            # NMC: exponential + polynomial (steep rise at low SOC, ~3.7V midrange, 4.2V full)
            V = (-1.031 * np.exp(-35.0 * soc)
                 + 3.685
                 + 0.2156 * soc
                 - 0.1178 * soc ** 2
                 + 0.3201 * soc ** 3
                 + 0.097 * soc ** 5)
        else:
            # LFP: flat mid-range plateau characteristic
            V = (3.0
                 + 0.6 * soc
                 - 0.8 * soc ** 2
                 + 1.1 * soc ** 3
                 - 0.55 * soc ** 4
                 + 0.1 * soc ** 5)

        return np.clip(V, self._V_cell_min, self._V_cell_max)

    def V_ocv_pack(self, soc=None):
        """System open-circuit voltage [V]."""
        if soc is None:
            soc = self.SOC
        return self._n_series_cells * self.V_ocv_cell(soc)

    def V_terminal(self, I_pack, soc=None):
        """System terminal voltage [V]. I_pack > 0 = discharging."""
        if soc is None:
            soc = self.SOC
        return self.V_ocv_pack(soc) - I_pack * self.R_pack

    def max_discharge_power(self, soc=None):
        """Maximum discharge power [W] at current SOC."""
        if soc is None:
            soc = self.SOC
        V_ocv = self.V_ocv_pack(soc)
        I_max = min(self.I_max_discharge, V_ocv / (2 * self.R_pack))
        V_t = V_ocv - I_max * self.R_pack
        V_t = max(V_t, self._n_series_cells * self._V_cell_min)
        return V_t * I_max

    def max_charge_power(self, soc=None):
        """Maximum charge (regen) power [W] at current SOC."""
        if soc is None:
            soc = self.SOC
        I_max = self.I_max_charge
        V_t = self.V_terminal(-I_max, soc)
        V_t = min(V_t, self._n_series_cells * self._V_cell_max)
        return V_t * I_max

    def compute_step(self, P_demand, dt):
        """
        Compute battery state for one time step.

        Parameters:
            P_demand: Power demand [W] (+ discharge, - charge/regen)
            dt: Time step [s]

        Returns dict with battery outputs.
        """
        V_ocv = self.V_ocv_pack()
        R = self.R_pack

        if abs(P_demand) < 1e-6:
            I_pack = 0.0
        else:
            discriminant = V_ocv ** 2 - 4 * R * P_demand
            if discriminant < 0:
                if P_demand > 0:
                    I_pack = self.I_max_discharge
                else:
                    I_pack = -self.I_max_charge
            else:
                I_pack = (V_ocv - np.sqrt(discriminant)) / (2 * R)

        # Apply current limits
        I_pack = np.clip(I_pack, -self.I_max_charge, self.I_max_discharge)

        # SOC limit protection
        if self.SOC <= self.SOC_min and I_pack > 0:
            I_pack = 0.0
        if self.SOC >= self.SOC_max and I_pack < 0:
            I_pack = 0.0

        # Terminal voltage
        V_t = self.V_terminal(I_pack)

        # Actual power & losses
        P_actual = V_t * I_pack
        P_loss = I_pack ** 2 * R

        # Update SOC
        dSOC = -I_pack * dt / (self.Q_pack_Ah * 3600)
        self.SOC = np.clip(self.SOC + dSOC, 0.0, 1.0)

        # Track energy
        if I_pack > 0:
            self.energy_discharged_Wh += P_actual * dt / 3600
        else:
            self.energy_charged_Wh += abs(P_actual) * dt / 3600
        self.total_energy_loss_Wh += P_loss * dt / 3600

        # Thermal update
        P_heat = P_loss
        dT = (P_heat - self.h_conv * self.A_surface * (self.T_batt - self.T_ambient))
        dT /= (self.m_batt * self.Cp_batt)
        self.T_batt += dT * dt

        return {
            'SOC': self.SOC,
            'V_terminal': V_t,
            'V_ocv': V_ocv,
            'I_pack': I_pack,
            'P_actual': P_actual,
            'P_loss': P_loss,
            'T_battery': self.T_batt,
            'E_discharged_Wh': self.energy_discharged_Wh,
            'E_charged_Wh': self.energy_charged_Wh,
            'E_loss_Wh': self.total_energy_loss_Wh,
        }

    def reset(self):
        """Reset battery state to initial conditions."""
        self.SOC = self.SOC_init
        self.T_batt = self.T_ambient
        self.energy_discharged_Wh = 0.0
        self.energy_charged_Wh = 0.0
        self.total_energy_loss_Wh = 0.0

    def get_info(self):
        return {
            'Kimya': self.chemistry,
            'Paket konfig': f'{self.n_packs_series}S{self.n_packs_parallel}P ({self.n_total_packs} paket)',
            'Tek paket': f'{self.V_pack_nom:.0f}V / {self.Q_pack_Ah_single:.0f}Ah / {self.V_pack_nom*self.Q_pack_Ah_single/1000:.1f} kWh',
            'Hücre/paket': f'{self._cells_per_pack} ({self.chemistry} {self._V_cell_nom}V)',
            'Sistem gerilimi [V]': round(self.V_pack_nominal, 1),
            'Sistem kapasitesi [Ah]': round(self.Q_pack_Ah, 1),
            'Sistem enerjisi [kWh]': round(self.E_pack_kWh, 1),
            'Sistem iç direnci [Ω]': round(self.R_pack, 4),
            'SOC penceresi': f'{self.SOC_min*100:.0f}% - {self.SOC_max*100:.0f}%',
            'Başlangıç SOC': self.SOC_init,
        }
