"""
Model configuration for the EcoXchange pvlib expected-generation service.

Model choices are selected for accuracy against real-world metered data, not
for computational speed. Each choice is documented with its rationale so the
reconciliation team can audit why a number changed.
"""

# Transposition model: Perez (1990).
# More accurate than Hay-Davies for tilted surfaces, especially at high tilt
# and in climates with variable cloud cover. Industry standard in PVsyst/SAM.
TRANSPOSITION_MODEL = "perez"

# Temperature model: SAPM (Sandia Array Performance Model).
# Well-validated across mounting configurations; empirically-derived
# coefficients from Sandia's outdoor testing program.
TEMPERATURE_MODEL = "sapm"

# IAM model: physical (Fresnel reflection losses vs. angle of incidence).
IAM_MODEL = "physical"

# Clear-sky model used only to give daily irradiance a realistic diurnal shape.
CLEARSKY_MODEL = "ineichen"

ENGINE_NAME = "ecoxchange-pvlib-service"
# 2.0.0: the service is now a thin wrapper over the canonical verification engine
# (Engine A). Kept in lockstep with verification_engine.__version__.
ENGINE_VERSION = "2.0.0"

# SAPM temperature-model parameters by racking type.
# Source: pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS["sapm"].
TEMP_PARAMS = {
    "open_rack": {"a": -3.56, "b": -0.075, "deltaT": 3},
    "roof_mount": {"a": -2.98, "b": -0.047, "deltaT": 1},
    "single_axis_tracker": {"a": -3.56, "b": -0.075, "deltaT": 3},
}

# Module technology mapping.
# gamma_pdc = temperature coefficient of power (1/°C, negative).
MODULE_PARAMS = {
    "monocrystalline": {"gamma_pdc": -0.0040, "bifacial": False},
    "polycrystalline": {"gamma_pdc": -0.0045, "bifacial": False},
    "thin_film": {"gamma_pdc": -0.0020, "bifacial": False},
    "cdte": {"gamma_pdc": -0.0032, "bifacial": False},
}

# Fallbacks applied when an optional project field is missing.
DEFAULT_MODULE_TYPE = "monocrystalline"
DEFAULT_RACKING_TYPE = "open_rack"
DEFAULT_INVERTER_EFFICIENCY = 0.96
DEFAULT_DC_AC_RATIO = 1.2
DEFAULT_ALBEDO = 0.2

# STC reference conditions.
STC_IRRADIANCE_W_M2 = 1000.0
STC_TEMP_C = 25.0
