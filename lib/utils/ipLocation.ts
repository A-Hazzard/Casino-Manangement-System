import { LocationCoordinates } from '@/lib/types/maps';

/**
 * Get user location from IP address as fallback
 * @returns Promise<LocationCoordinates | null>
 */
export async function getLocationFromIP(): Promise<LocationCoordinates | null> {
  try {
    // Try multiple IP geolocation services as fallbacks
    const services = [
      'https://ipapi.co/json/',
      'https://ip-api.com/json/',
      'https://api.ipify.org?format=json',
    ];

    for (const service of services) {
      try {
        const response = await fetch(service, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        // Handle different response formats
        let lat, lng;

        if (service.includes('ipapi.co')) {
          lat = data.latitude;
          lng = data.longitude;
        } else if (service.includes('ip-api.com')) {
          lat = data.lat;
          lng = data.lon;
        } else if (service.includes('ipify.org')) {
          // ipify.org doesn't provide location, skip
          continue;
        }

        if (lat && lng) {
          const result = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
          };
          return result;
        }
      } catch {
        continue;
      }
    }

    console.warn('All IP services failed');
    return null;
  } catch (error) {
    console.error('Failed to get location from IP:', error);
    return null;
  }
}

/**
 * Get user location with fallback to IP
 * @returns Promise<LocationCoordinates | null>
 */
export async function getUserLocationWithFallback(): Promise<LocationCoordinates | null> {
  // First try to get location from geolocation API
  if (navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => {
              resolve(pos);
            },
            error => {
              // Provide more specific error information
              let errorMessage = 'Unknown geolocation error';
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Location access denied by user';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage =
                    'Location information unavailable (check Windows location services)';
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Location request timed out';
                  break;
              }
              console.warn(`Geolocation failed: ${errorMessage}`);
              reject(error);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 600000, // 5 minutes cache
            }
          );
        }
      );

      const result = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      return result;
    } catch (error) {
      console.warn('Geolocation denied or failed:', error);
    }
  } else {
    console.warn('Geolocation API not available');
  }

  // Fallback to IP-based location
  const ipLocation = await getLocationFromIP();
  return ipLocation;
}
