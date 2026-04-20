"""
Drive Cycle Module - UITP SORT 2014 compliant bus drive cycles.

Reference: UITP Project "SORT" - Standardised On-Road Test Cycles, 2014 Edition.

Each SORT cycle = 1 module = 3 trapezoids (sections).
Each trapezoid = acceleration (0→v) → constant speed → deceleration (v→0) → stop.

Accelerations are speed-dependent (amin = f(v)):
  20 km/h → 1.03 m/s²
  30 km/h → 0.77 m/s²
  40 km/h → 0.62 m/s²
  50 km/h → 0.57 m/s²
  60 km/h → 0.46 m/s²

Deceleration is fixed: b = 0.8 m/s² for all sections.

SORT 1 (Heavy Urban):  v = 20/30/40 km/h,  d = 100/200/220m,  stops = 20/20/20s
SORT 2 (Easy Urban):   v = 20/40/50 km/h,  d = 100/220/600m,  stops = 20/20/20s
SORT 3 (Easy Suburban): v = 30/50/60 km/h,  d = 200/600/650m,  stops = 20/10/10s

Supports: SORT1, SORT2, SORT3, BRAUNSCHWEIG, Custom CSV.
All cycles output time [s] and target velocity [m/s] arrays.
"""

import numpy as np


# SORT acceleration lookup: target speed (km/h) → minimum acceleration (m/s²)
_SORT_ACCELERATION = {
    20: 1.03,
    30: 0.77,
    40: 0.62,
    50: 0.57,
    60: 0.46,
}

# Fixed deceleration for all SORT cycles [m/s²]
_SORT_DECELERATION = 0.8


def _build_trapezoid(v_target_kmh, d_total, t_stop, dt_resolution=0.01):
    """
    Build one SORT trapezoid (section): accel → cruise → decel → stop.

    Parameters:
        v_target_kmh: Target constant speed [km/h]
        d_total: Total section distance [m] (from start to full stop)
        t_stop: Stop/dwell time after deceleration [s]
        dt_resolution: Time resolution for generated points [s]

    Returns:
        (time_array, velocity_array) for this trapezoid
    """
    v_target = v_target_kmh / 3.6  # [m/s]
    a_acc = _SORT_ACCELERATION[v_target_kmh]
    b_dec = _SORT_DECELERATION

    # Acceleration phase: v = a*t, d = 0.5*a*t²
    t_acc = v_target / a_acc
    d_acc = v_target ** 2 / (2 * a_acc)

    # Deceleration phase: d = v²/(2*b)
    t_dec = v_target / b_dec
    d_dec = v_target ** 2 / (2 * b_dec)

    # Constant speed phase
    d_const = d_total - d_acc - d_dec
    if d_const < 0:
        d_const = 0.0
    t_const = d_const / v_target if v_target > 0 else 0.0

    segments = []

    # Acceleration: 0 → v_target
    n_acc = max(int(t_acc / dt_resolution), 2)
    t_a = np.linspace(0, t_acc, n_acc)
    v_a = a_acc * t_a  # v = a*t (constant acceleration)
    segments.append((t_a, v_a))

    # Constant speed
    if t_const > 0:
        n_const = max(int(t_const / dt_resolution), 2)
        t_c = np.linspace(0, t_const, n_const)
        v_c = np.full(n_const, v_target)
        segments.append((t_c, v_c))

    # Deceleration: v_target → 0
    n_dec = max(int(t_dec / dt_resolution), 2)
    t_d = np.linspace(0, t_dec, n_dec)
    v_d = v_target - b_dec * t_d  # v = v0 - b*t
    v_d = np.maximum(v_d, 0.0)
    segments.append((t_d, v_d))

    # Stop/dwell
    if t_stop > 0:
        n_stop = max(int(t_stop / dt_resolution), 2)
        t_s = np.linspace(0, t_stop, n_stop)
        v_s = np.zeros(n_stop)
        segments.append((t_s, v_s))

    return segments


def _build_sort_module(trapezoids):
    """
    Build one SORT module from a list of trapezoid definitions.

    Parameters:
        trapezoids: list of (v_target_kmh, d_total, t_stop) tuples

    Returns:
        list of (time_array, velocity_array) segments
    """
    all_segments = []
    for v_kmh, d_total, t_stop in trapezoids:
        segs = _build_trapezoid(v_kmh, d_total, t_stop)
        all_segments.extend(segs)
    return all_segments


def generate_sort1(n_modules=2):
    """
    SORT 1 - Heavy Urban Bus Cycle (UITP 2014).

    3 trapezoids per module:
      Section 1: 20 km/h, 100m, a=1.03 m/s², stop 20s
      Section 2: 30 km/h, 200m, a=0.77 m/s², stop 20s
      Section 3: 40 km/h, 220m, a=0.62 m/s², stop 20s
    Deceleration: 0.8 m/s²

    Total distance per module: 520m
    Calculated time per module: ~154.5s
    Average speed: ~12.1 km/h
    Stops/km: 5.8

    Per SORT protocol, SORT 1 must run at least 2 modules (1040m).
    """
    trapezoids = [
        (20, 100, 20),   # Section 1
        (30, 200, 20),   # Section 2
        (40, 220, 20),   # Section 3
    ]

    all_segments = []
    for _ in range(n_modules):
        all_segments.extend(_build_sort_module(trapezoids))

    return _concat_segments(all_segments)


def generate_sort2(n_modules=1):
    """
    SORT 2 - Easy Urban Bus Cycle (UITP 2014).

    3 trapezoids per module:
      Section 1: 20 km/h, 100m, a=1.03 m/s², stop 20s
      Section 2: 40 km/h, 220m, a=0.62 m/s², stop 20s
      Section 3: 50 km/h, 600m, a=0.57 m/s², stop 20s
    Deceleration: 0.8 m/s²

    Total distance per module: 920m
    Calculated time per module: ~183.9s
    Average speed: ~18 km/h
    Stops/km: 3.3
    """
    trapezoids = [
        (20, 100, 20),   # Section 1
        (40, 220, 20),   # Section 2
        (50, 600, 20),   # Section 3
    ]

    all_segments = []
    for _ in range(n_modules):
        all_segments.extend(_build_sort_module(trapezoids))

    return _concat_segments(all_segments)


def generate_sort3(n_modules=1):
    """
    SORT 3 - Easy Suburban Bus Cycle (UITP 2014).

    3 trapezoids per module:
      Section 1: 30 km/h, 200m, a=0.77 m/s², stop 20s
      Section 2: 50 km/h, 600m, a=0.57 m/s², stop 10s
      Section 3: 60 km/h, 650m, a=0.46 m/s², stop 10s
    Deceleration: 0.8 m/s²

    Total distance per module: 1,450m
    Calculated time per module: ~206.2s
    Average speed: ~25.3 km/h
    Stops/km: 2.1
    """
    trapezoids = [
        (30, 200, 20),   # Section 1
        (50, 600, 10),   # Section 2
        (60, 650, 10),   # Section 3
    ]

    all_segments = []
    for _ in range(n_modules):
        all_segments.extend(_build_sort_module(trapezoids))

    return _concat_segments(all_segments)


def generate_braunschweig():
    """
    Braunschweig City Bus Cycle (simplified representation).
    Total ~1740s, representative European urban bus operation.
    Max ~58 km/h, avg ~22.6 km/h with 37 stops.
    """
    np.random.seed(42)  # Reproducible
    segments = []
    max_speeds_kmh = [
        30, 45, 50, 35, 55, 40, 50, 45, 30, 58,
        42, 50, 35, 48, 55, 40, 30, 50, 45, 35,
        55, 42, 50, 30, 48, 40, 55, 45, 50, 35,
        42, 58, 30, 50, 45, 40, 35,
    ]

    for v_max_kmh in max_speeds_kmh:
        v_max = v_max_kmh / 3.6
        # Acceleration phase (0.8-1.2 m/s² typical bus acceleration)
        a_acc = 0.8 + 0.4 * np.random.random()
        t_acc = v_max / a_acc
        n_acc = max(int(t_acc * 10), 10)
        t_a = np.linspace(0, t_acc, n_acc)
        v_a = np.linspace(0, v_max, n_acc)
        segments.append((t_a, v_a))

        # Cruise phase
        t_cruise = 3 + 12 * np.random.random()
        n_cr = max(int(t_cruise * 10), 10)
        t_c = np.linspace(0, t_cruise, n_cr)
        v_c = np.full(n_cr, v_max)
        segments.append((t_c, v_c))

        # Deceleration phase (1.0-1.5 m/s² comfortable bus decel)
        a_dec = 1.0 + 0.5 * np.random.random()
        t_dec = v_max / a_dec
        n_dec = max(int(t_dec * 10), 10)
        t_d = np.linspace(0, t_dec, n_dec)
        v_d = np.linspace(v_max, 0, n_dec)
        segments.append((t_d, v_d))

        # Dwell at stop (10-30s for bus stops)
        t_dwell = 10 + 20 * np.random.random()
        n_dw = max(int(t_dwell * 10), 10)
        t_w = np.linspace(0, t_dwell, n_dw)
        v_w = np.zeros(n_dw)
        segments.append((t_w, v_w))

    return _concat_segments(segments)


def load_custom_csv(filepath):
    """
    Load a custom drive cycle from CSV file.
    CSV format: time_s, velocity_kmh
    First row can be header (auto-detected).
    """
    import csv
    times = []
    velocities = []

    with open(filepath, 'r', newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if i == 0:
                try:
                    float(row[0])
                except ValueError:
                    continue  # Skip header
            if len(row) >= 2:
                t = float(row[0])
                v_kmh = float(row[1])
                times.append(t)
                velocities.append(v_kmh / 3.6)  # Convert to m/s

    return np.array(times), np.array(velocities)


def _concat_segments(segments):
    """Concatenate time-velocity segments into continuous arrays."""
    all_t = []
    all_v = []
    t_offset = 0.0

    for t_seg, v_seg in segments:
        all_t.append(t_seg + t_offset)
        all_v.append(v_seg)
        t_offset += t_seg[-1]

    time = np.concatenate(all_t)
    velocity = np.concatenate(all_v)

    # Remove duplicate time points
    _, unique_idx = np.unique(time, return_index=True)
    unique_idx = np.sort(unique_idx)

    return time[unique_idx], velocity[unique_idx]


def get_cycle(name, csv_path=None):
    """
    Get drive cycle by name.

    Parameters:
        name: 'SORT1', 'SORT2', 'SORT3', 'BRAUNSCHWEIG', 'CUSTOM'
        csv_path: path to CSV file (only for 'CUSTOM')

    Returns:
        time_s: numpy array of time [s]
        velocity_ms: numpy array of velocity [m/s]
    """
    generators = {
        'SORT1': generate_sort1,
        'SORT2': generate_sort2,
        'SORT3': generate_sort3,
        'BRAUNSCHWEIG': generate_braunschweig,
    }

    name_upper = name.upper().replace(' ', '').replace('-', '')

    if name_upper == 'CUSTOM' and csv_path:
        return load_custom_csv(csv_path)
    elif name_upper in generators:
        return generators[name_upper]()
    else:
        raise ValueError(f"Unknown drive cycle: {name}. "
                         f"Available: {list(generators.keys())} or 'CUSTOM'")
