# OpenStreetMap Integration

This project uses OpenStreetMap data for displaying maps and geocoding services. The integration follows the [OpenStreetMap Attribution Guidelines](https://www.openstreetmap.org/copyright) and [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/).

## License Information

- Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- Map tiles are licensed under [Creative Commons Attribution-ShareAlike 2.0](https://creativecommons.org/licenses/by-sa/2.0/)

## Usage Guidelines

This implementation respects the following guidelines:

1. Proper attribution is provided on all map displays
2. Geocoding requests to Nominatim are rate-limited and include appropriate user-agent headers
3. Results include links back to OpenStreetMap when applicable

## Libraries Used

- [Leaflet](https://leafletjs.com/) - An open-source JavaScript library for mobile-friendly interactive maps
- [React-Leaflet](https://react-leaflet.js.org/) - React components for Leaflet maps

## Responsible Usage Guidelines

When developing features that use the OpenStreetMap API:

- Cache results when appropriate
- Rate-limit API calls (maximum 1 request per second)
- Provide proper attribution
- Consider setting up a local instance for high-volume applications

For more information on responsible usage, see the [OpenStreetMap API Usage Policy](https://operations.osmfoundation.org/policies/api/).
