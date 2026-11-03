# CA-Flick

CA-Flick is an independently maintained cross-platform media application built with Expo and React Native.

**Repository:** https://github.com/Candersondev/CA-Flick

## Supported features

- Catalog browsing and metadata via TMDB
- Local media playback and downloads
- Optional subtitle integration
- Watch parties and synchronized playback
- Android, Android TV, iOS, and macOS build targets
- Optional authorized streaming-provider integrations

## Streaming content

CA-Flick does not include licensed movies or TV streams. Configure only sources for which you have authorization. TMDB supplies metadata, not playback rights. The optional Live TV M3U source is disabled by default. Other existing source integrations must be independently reviewed for licensing and provider authorization before distribution.

## Development

1. Run `npm ci`.
2. Copy `.env.example` to `.env` and configure your own API access.
3. Run `npm run android` or `npm run ios`.
4. Use the GitHub Actions workflow to build release artifacts. Production distribution requires proper Android and Apple signing credentials.

## Independent project and attribution

CA-Flick is based on Flickv4 by its original contributors: https://github.com/sheeshcake/Flickv4. Original copyright notices and license terms remain applicable. See the repository's GPL-3.0 license. CA-Flick is not affiliated with, endorsed by, or maintained by the original Flickv4 project.
