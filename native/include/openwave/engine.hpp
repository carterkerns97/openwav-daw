#pragma once

#include <atomic>
#include <cstdint>
#include <span>
#include <vector>

#if defined(_WIN32)
#if defined(OPENWAVE_ENGINE_BUILD)
#define OPENWAVE_ENGINE_API __declspec(dllexport)
#else
#define OPENWAVE_ENGINE_API __declspec(dllimport)
#endif
#else
#define OPENWAVE_ENGINE_API __attribute__((visibility("default")))
#endif

namespace openwave {

struct TrackParameters {
  float gain = 1.0F;
  float pan = 0.0F;
  bool muted = false;
  bool solo = false;
};

class OPENWAVE_ENGINE_API Engine final {
public:
  bool prepare(double sampleRate, std::uint32_t maximumBlockSize,
               std::uint32_t trackCount);
  void setTempo(double beatsPerMinute) noexcept;
  void setPlaying(bool playing) noexcept;
  void seekSamples(std::int64_t samplePosition) noexcept;
  void setTrackParameters(std::uint32_t track,
                          TrackParameters parameters) noexcept;

  [[nodiscard]] double sampleRate() const noexcept;
  [[nodiscard]] double tempo() const noexcept;
  [[nodiscard]] bool isPlaying() const noexcept;
  [[nodiscard]] std::int64_t samplePosition() const noexcept;
  [[nodiscard]] double beatPosition() const noexcept;
  [[nodiscard]] std::uint32_t trackCount() const noexcept;

  // Planar stereo buffers. This method never allocates and is intended for the
  // realtime audio thread. Inputs and outputs may alias.
  void process(std::span<const float* const> inputLeft,
               std::span<const float* const> inputRight,
               float* outputLeft, float* outputRight,
               std::uint32_t frameCount) noexcept;

private:
  struct TrackState {
    std::atomic<float> gain{1.0F};
    std::atomic<float> pan{0.0F};
    std::atomic<bool> muted{false};
    std::atomic<bool> solo{false};

    TrackState() = default;
    TrackState(const TrackState& other) noexcept
        : gain(other.gain.load(std::memory_order_relaxed)),
          pan(other.pan.load(std::memory_order_relaxed)),
          muted(other.muted.load(std::memory_order_relaxed)),
          solo(other.solo.load(std::memory_order_relaxed)) {}
    TrackState& operator=(const TrackState& other) noexcept {
      gain.store(other.gain.load(std::memory_order_relaxed),
                 std::memory_order_relaxed);
      pan.store(other.pan.load(std::memory_order_relaxed),
                std::memory_order_relaxed);
      muted.store(other.muted.load(std::memory_order_relaxed),
                  std::memory_order_relaxed);
      solo.store(other.solo.load(std::memory_order_relaxed),
                 std::memory_order_relaxed);
      return *this;
    }
  };

  double sampleRate_ = 0.0;
  std::uint32_t maximumBlockSize_ = 0;
  std::vector<TrackState> tracks_;
  std::atomic<double> tempo_{120.0};
  std::atomic<std::int64_t> samplePosition_{0};
  std::atomic<bool> playing_{false};
};

} // namespace openwave
