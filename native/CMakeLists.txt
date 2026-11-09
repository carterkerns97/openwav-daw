cmake_minimum_required(VERSION 3.24)
project(openwave_engine VERSION 0.1.0 LANGUAGES CXX)

option(OPENWAVE_BUILD_TESTS "Build native engine tests" ON)

add_library(openwave_engine SHARED
  src/engine.cpp
  src/c_api.cpp
)

target_compile_features(openwave_engine PUBLIC cxx_std_20)
target_include_directories(openwave_engine PUBLIC include)
target_compile_definitions(openwave_engine PRIVATE OPENWAVE_ENGINE_BUILD)

if(MSVC)
  target_compile_options(openwave_engine PRIVATE /W4 /permissive-)
else()
  target_compile_options(openwave_engine PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()

if(OPENWAVE_BUILD_TESTS)
  enable_testing()
  add_executable(openwave_engine_tests tests/engine_tests.cpp)
  target_link_libraries(openwave_engine_tests PRIVATE openwave_engine)
  target_compile_features(openwave_engine_tests PRIVATE cxx_std_20)
  add_test(NAME openwave_engine_tests COMMAND openwave_engine_tests)
endif()
