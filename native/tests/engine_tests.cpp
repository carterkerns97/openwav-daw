#include <openwave/engine.hpp>

#include <array>
#include <cassert>
#include <cmath>

int main() {
  openwave::Engine engine;
  assert(!engine.prepare(0.0, 512, 2));
  assert(engine.prepare(48'000.0, 512, 2));
  engine.setTempo(120.0);
  engine.setPlaying(true);

  std::array<float, 128> trackOneLeft{};
  std::array<float, 128> trackOneRight{};
  std::array<float, 128> trackTwoLeft{};
  std::array<float, 128> trackTwoRight{};
  trackOneLeft.fill(1.0F);
  trackOneRight.fill(1.0F);
  trackTwoLeft.fill(0.5F);
  trackTwoRight.fill(0.5F);
  const std::array<const float*, 2> left{trackOneLeft.data(), trackTwoLeft.data()};
  const std::array<const float*, 2> right{trackOneRight.data(), trackTwoRight.data()};
  std::array<float, 128> outputLeft{};
  std::array<float, 128> outputRight{};

  engine.process(left, right, outputLeft.data(), outputRight.data(), 128);
  assert(engine.samplePosition() == 128);
  assert(outputLeft[0] > 1.0F);
  assert(std::abs(outputLeft[0] - outputRight[0]) < 0.0001F);

  engine.seekSamples(48'000);
  assert(std::abs(engine.beatPosition() - 2.0) < 0.0001);
  engine.setTempo(60.0);
  assert(std::abs(engine.beatPosition() - 1.0) < 0.0001);

  engine.setTrackParameters(1, {.gain = 1.0F, .pan = 0.0F, .muted = true});
  engine.process(left, right, outputLeft.data(), outputRight.data(), 128);
  assert(outputLeft[0] < 1.0F);
  return 0;
}
