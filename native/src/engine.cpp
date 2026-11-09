#include <openwave/engine.hpp>

#include <algorithm>
#include <cmath>
#include <numbers>

namespace openwave {

bool Engine::prepare(const double sampleRate,
                     const std::uint32_t maximumBlockSize,
                     const std::uint32_t trackCount) {
  if (!std::isfinite(sampleRate) || sampleRate <= 0.0 ||
      maximumBlockSize == 0 || trackCount == 0) {
    return false;
  }
  sampleRate_ = sampleRate;
  maximumBlockSize_ = maximumBlockSize;
  tracks_.resize(trackCount);
  samplePosition_.store(0, std::memory_order_relaxed);
  playing_.store(false, std::memory_order_relaxed);
  return true;
}

void Engine::setTempo(const double beatsPerMinute) noexcept {
  if (std::isfinite(beatsPerMinute))
    tempo_.store(std::clamp(beatsPerMinute, 20.0, 999.0),
                 std::memory_order_relaxed);
}

void Engine::setPlaying(const bool playing) noexcept {
  playing_.store(playing, std::memory_order_release);
}

void Engine::seekSamples(const std::int64_t samplePosition) noexcept {
  samplePosition_.store(std::max<std::int64_t>(0, samplePosition),
                        std::memory_order_release);
}

void Engine::setTrackParameters(const std::uint32_t track,
                                TrackParameters parameters) noexcept {
  if (track >= tracks_.size())
    return;
  parameters.gain = std::clamp(parameters.gain, 0.0F, 4.0F);
  parameters.pan = std::clamp(parameters.pan, -1.0F, 1.0F);
  auto& state = tracks_[track];
  state.gain.store(parameters.gain, std::memory_order_release);
  state.pan.store(parameters.pan, std::memory_order_release);
  state.muted.store(parameters.muted, std::memory_order_release);
  state.solo.store(parameters.solo, std::memory_order_release);
}

double Engine::sampleRate() const noexcept { return sampleRate_; }
double Engine::tempo() const noexcept {
  return tempo_.load(std::memory_order_relaxed);
}
bool Engine::isPlaying() const noexcept {
  return playing_.load(std::memory_order_acquire);
}
std::int64_t Engine::samplePosition() const noexcept {
  return samplePosition_.load(std::memory_order_acquire);
}
double Engine::beatPosition() const noexcept {
  if (sampleRate_ <= 0.0)
    return 0.0;
  return static_cast<double>(samplePosition()) / sampleRate_ * tempo() / 60.0;
}
std::uint32_t Engine::trackCount() const noexcept {
  return static_cast<std::uint32_t>(tracks_.size());
}

void Engine::process(const std::span<const float* const> inputLeft,
                     const std::span<const float* const> inputRight,
                     float* const outputLeft, float* const outputRight,
                     const std::uint32_t frameCount) noexcept {
  if (outputLeft == nullptr || outputRight == nullptr || frameCount == 0 ||
      frameCount > maximumBlockSize_) {
    return;
  }
  std::fill_n(outputLeft, frameCount, 0.0F);
  std::fill_n(outputRight, frameCount, 0.0F);

  const auto count = std::min({tracks_.size(), inputLeft.size(), inputRight.size()});
  const bool anySolo = std::any_of(tracks_.begin(), tracks_.end(), [](const auto& track) {
    return track.solo.load(std::memory_order_acquire);
  });

  for (std::size_t trackIndex = 0; trackIndex < count; ++trackIndex) {
    const auto& track = tracks_[trackIndex];
    const bool muted = track.muted.load(std::memory_order_acquire);
    const bool solo = track.solo.load(std::memory_order_acquire);
    if (muted || (anySolo && !solo) || inputLeft[trackIndex] == nullptr ||
        inputRight[trackIndex] == nullptr)
      continue;

    const float gain = track.gain.load(std::memory_order_acquire);
    const float pan = track.pan.load(std::memory_order_acquire);
    const float angle = (pan + 1.0F) * 0.25F * std::numbers::pi_v<float>;
    const float leftGain = gain * std::cos(angle);
    const float rightGain = gain * std::sin(angle);
    for (std::uint32_t frame = 0; frame < frameCount; ++frame) {
      outputLeft[frame] += inputLeft[trackIndex][frame] * leftGain;
      outputRight[frame] += inputRight[trackIndex][frame] * rightGain;
    }
  }

  if (isPlaying())
    samplePosition_.fetch_add(frameCount, std::memory_order_release);
}

} // namespace openwave
