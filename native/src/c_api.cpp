#include <openwave/c_api.h>
#include <openwave/engine.hpp>

#include <new>

struct openwave_engine {
  openwave::Engine value;
};

openwave_engine* openwave_engine_create(void) {
  return new (std::nothrow) openwave_engine{};
}

void openwave_engine_destroy(openwave_engine* const engine) { delete engine; }

int openwave_engine_prepare(openwave_engine* const engine,
                            const double sample_rate,
                            const uint32_t maximum_block_size,
                            const uint32_t track_count) {
  return engine != nullptr &&
         engine->value.prepare(sample_rate, maximum_block_size, track_count);
}

void openwave_engine_set_tempo(openwave_engine* const engine,
                               const double beats_per_minute) {
  if (engine != nullptr)
    engine->value.setTempo(beats_per_minute);
}

void openwave_engine_set_playing(openwave_engine* const engine,
                                 const int playing) {
  if (engine != nullptr)
    engine->value.setPlaying(playing != 0);
}

void openwave_engine_seek_samples(openwave_engine* const engine,
                                  const int64_t sample_position) {
  if (engine != nullptr)
    engine->value.seekSamples(sample_position);
}

int64_t openwave_engine_sample_position(const openwave_engine* const engine) {
  return engine == nullptr ? 0 : engine->value.samplePosition();
}

double openwave_engine_beat_position(const openwave_engine* const engine) {
  return engine == nullptr ? 0.0 : engine->value.beatPosition();
}
