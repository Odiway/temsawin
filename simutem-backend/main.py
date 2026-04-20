"""
SiMUTEM - FastAPI Backend for Electric Bus Energy Simulation.
Wraps the existing Python simulation engine as a REST API.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import numpy as np

from simulation.simulator import Simulator

app = FastAPI(title="SiMUTEM API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class SimulationRequest(BaseModel):
    cycle: str = Field(default="SORT1", description="SORT1, SORT2, SORT3, BRAUNSCHWEIG")
    # Vehicle params
    m_curb: float = Field(default=12000.0, description="Curb weight [kg]")
    n_passengers: int = Field(default=40, description="Number of passengers")
    Cd: float = Field(default=0.6, description="Drag coefficient")
    Af: float = Field(default=5.9, description="Frontal area [m²]")
    Cr: float = Field(default=0.0068, description="Rolling resistance coefficient")
    P_aux: float = Field(default=5000.0, description="Auxiliary power [W]")
    P_hvac: float = Field(default=7000.0, description="HVAC power [W]")
    gear_ratio: float = Field(default=6.0, description="Gear ratio")
    r_wheel: float = Field(default=0.391, description="Wheel radius [m]")
    # Battery params
    SOC_init: float = Field(default=0.9, description="Initial SOC")
    E_pack_kWh: float = Field(default=220.0, description="Battery pack energy [kWh]")
    V_nom: float = Field(default=600.0, description="Nominal voltage [V]")
    n_series: int = Field(default=168, description="Cells in series")
    n_parallel: int = Field(default=4, description="Cells in parallel")
    # Motor params
    T_max: float = Field(default=500.0, description="Max motor torque [Nm]")
    P_max: float = Field(default=160000.0, description="Max motor power [W]")

def downsample(arr, n=500):
    """Downsample array to n points for efficient frontend rendering."""
    if len(arr) <= n:
        return arr.tolist()
    idx = np.linspace(0, len(arr) - 1, n, dtype=int)
    return arr[idx].tolist()

@app.post("/api/simulate")
def run_simulation(req: SimulationRequest):
    allowed_cycles = {"SORT1", "SORT2", "SORT3", "BRAUNSCHWEIG"}
    if req.cycle.upper() not in allowed_cycles:
        raise HTTPException(400, f"Invalid cycle. Allowed: {list(allowed_cycles)}")

    vehicle_params = {
        'm_curb': req.m_curb,
        'n_passengers': req.n_passengers,
        'Cd': req.Cd, 'Af': req.Af, 'Cr': req.Cr,
        'P_aux': req.P_aux, 'P_hvac': req.P_hvac,
        'gear_ratio': req.gear_ratio, 'r_wheel': req.r_wheel,
    }
    battery_params = {
        'SOC_init': req.SOC_init,
        'E_pack_kWh': req.E_pack_kWh,
        'V_nom': req.V_nom,
        'n_series': req.n_series,
        'n_parallel': req.n_parallel,
    }
    motor_params = {
        'T_max': req.T_max,
        'P_max': req.P_max,
    }

    sim = Simulator(
        vehicle_params=vehicle_params,
        battery_params=battery_params,
        motor_params=motor_params,
    )
    results = sim.run(cycle_name=req.cycle, dt=0.05)
    summary = sim.compute_summary(results)
    d = results.to_dict()

    N = 500
    charts = {
        'time': downsample(d['time'], N),
        'v_reference': downsample(d['v_reference'] * 3.6, N),
        'v_actual': downsample(d['v_actual'] * 3.6, N),
        'SOC': downsample(d['SOC'] * 100, N),
        'P_battery': downsample(d['P_battery'] / 1000, N),
        'E_consumed_Wh': downsample(d['E_consumed_Wh'], N),
        'E_regen_Wh': downsample(d['E_regen_Wh'], N),
        'F_traction': downsample(d['F_traction'] / 1000, N),
        'F_rolling': downsample(d['F_rolling'] / 1000, N),
        'F_aero': downsample(d['F_aero'] / 1000, N),
        'T_motor': downsample(d['T_motor'], N),
        'eta_motor': downsample(d['eta_motor'] * 100, N),
        'T_battery': downsample(d['T_battery'], N),
    }

    return {"summary": summary, "charts": charts}

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "simutem"}
