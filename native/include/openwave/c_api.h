#pragma once

#include <stdint.h>

#if defined(_WIN32)
#if defined(OPENWAVE_ENGINE_BUILD)
#define OPENWAVE_API __declspec(dllexport)
#else
#define OPENWAVE_API __declspec(dllimport)
#endif
#else
#define OPENWAVE_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

typedef struct openwave_engine openwave_engine;

OPENWAVE_API openwave_engine* openwave_engine_create(void);
OPENWAVE_API void openwave_engine_destroy(openwave_engine* engine);
OPENWAVE_API int openwave_engine_prepare(openwave_engine* engine,
                                         double sample_rate,
                                         uint32_t maximum_block_size,
                                         uint32_t track_count);
OPENWAVE_API void openwave_engine_set_tempo(openwave_engine* engine,
                                            double beats_per_minute);
OPENWAVE_API void openwave_engine_set_playing(openwave_engine* engine,
                                              int playing);
OPENWAVE_API void openwave_engine_seek_samples(openwave_engine* engine,
                                               int64_t sample_position);
OPENWAVE_API int64_t
openwave_engine_sample_position(const openwave_engine* engine);
OPENWAVE_API double openwave_engine_beat_position(const openwave_engine* engine);

#ifdef __cplusplus
}
#endif
