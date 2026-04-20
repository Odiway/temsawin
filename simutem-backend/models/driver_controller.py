"""
Driver Controller - PID speed controller.

The driver model acts as a PID controller that tracks the drive cycle
reference speed by generating throttle/brake commands.

  error = v_reference - v_actual

  throttle_brake = Kp * e + Ki * ∫e dt + Kd * de/dt

Output:
  - Positive output → acceleration demand (throttle)
  - Negative output → braking demand (brake pedal)

The output is normalized to [-1, 1]:
  +1 = full throttle
  -1 = full brake
"""

import numpy as np


class DriverController:
    """PID-based driver model for bus speed tracking."""

    def __init__(self, params=None):
        p = params or {}

        # PID gains
        self.Kp = p.get('Kp', 2.0)       # Proportional gain
        self.Ki = p.get('Ki', 0.3)        # Integral gain
        self.Kd = p.get('Kd', 0.1)        # Derivative gain

        # Anti-windup limit for integral term
        self.integral_max = p.get('integral_max', 50.0)

        # Output limits
        self.throttle_max = p.get('throttle_max', 1.0)   # Max throttle [-]
        self.brake_max = p.get('brake_max', -1.0)         # Max brake [-]

        # Smoothing / driver reaction
        self.alpha_filter = p.get('alpha_filter', 0.3)    # Low-pass filter coefficient

        # State
        self.integral = 0.0
        self.prev_error = 0.0
        self.prev_output = 0.0

    def compute(self, v_reference, v_actual, dt):
        """
        Compute driver command (throttle/brake).

        Parameters:
            v_reference: Target speed [m/s]
            v_actual: Current vehicle speed [m/s]
            dt: Time step [s]

        Returns:
            command: float in [-1, 1], (+)=throttle, (-)=brake
            is_braking: bool
        """
        error = v_reference - v_actual

        # Proportional
        P = self.Kp * error

        # Integral with anti-windup
        self.integral += error * dt
        self.integral = np.clip(self.integral, -self.integral_max, self.integral_max)
        I = self.Ki * self.integral

        # Derivative (with filtering to reduce noise)
        if dt > 0:
            derivative = (error - self.prev_error) / dt
        else:
            derivative = 0.0
        D = self.Kd * derivative

        # PID output
        raw_output = P + I + D

        # Low-pass filter for smooth driving behavior
        filtered = self.alpha_filter * raw_output + (1 - self.alpha_filter) * self.prev_output

        # Clip to [-1, 1]
        command = np.clip(filtered, self.brake_max, self.throttle_max)

        # Update states
        self.prev_error = error
        self.prev_output = command

        is_braking = command < -0.02  # Small dead zone

        return command, is_braking

    def reset(self):
        """Reset controller state."""
        self.integral = 0.0
        self.prev_error = 0.0
        self.prev_output = 0.0

    def get_info(self):
        return {
            'Kp': self.Kp,
            'Ki': self.Ki,
            'Kd': self.Kd,
            'Anti-windup limit': self.integral_max,
        }
