'use client';

import { useState, useEffect } from 'react';

export default function NearbyHospitals() {
  const [location, setLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(5000); // 5km default

  const getCurrentLocation = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        fetchNearbyHospitals(latitude, longitude, radius);
      },
      (err) => {
        let errorMsg = 'Unable to retrieve your location';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = 'Location permission denied. Please enable location access.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = 'Location information unavailable.';
            break;
          case err.TIMEOUT:
            errorMsg = 'Location request timed out.';
            break;
        }
        setError(errorMsg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const fetchNearbyHospitals = async (lat, lng, rad) => {
    setLoading(true);
    setError('');

    try {
      // Overpass API query for hospitals, clinics, and doctors
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:${rad},${lat},${lng});
          way["amenity"="hospital"](around:${rad},${lat},${lng});
          relation["amenity"="hospital"](around:${rad},${lat},${lng});
          node["amenity"="clinic"](around:${rad},${lat},${lng});
          way["amenity"="clinic"](around:${rad},${lat},${lng});
          node["amenity"="doctors"](around:${rad},${lat},${lng});
          way["amenity"="doctors"](around:${rad},${lat},${lng});
          node["healthcare"="hospital"](around:${rad},${lat},${lng});
          way["healthcare"="hospital"](around:${rad},${lat},${lng});
        );
        out body center;
        >;
        out skel qt;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hospitals from Overpass API');
      }

      const data = await response.json();
      
      // Process and sort by distance
      const processedHospitals = data.elements
        .filter(el => el.tags && (el.tags.name || el.tags.amenity))
        .map(el => {
          const elLat = el.lat || el.center?.lat;
          const elLng = el.lon || el.center?.lon;
          const distance = calculateDistance(lat, lng, elLat, elLng);
          
          return {
            id: el.id,
            name: el.tags.name || el.tags.amenity || 'Unnamed Facility',
            type: el.tags.amenity || el.tags.healthcare || 'hospital',
            address: formatAddress(el.tags),
            phone: el.tags.phone || el.tags['contact:phone'] || null,
            website: el.tags.website || el.tags['contact:website'] || null,
            emergency: el.tags.emergency === 'yes',
            lat: elLat,
            lng: elLng,
            distance: distance,
            openingHours: el.tags.opening_hours || null,
          };
        })
        .sort((a, b) => a.distance - b.distance);

      setHospitals(processedHospitals);
    } catch (err) {
      console.error('Error fetching hospitals:', err);
      setError('Failed to fetch nearby hospitals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatAddress = (tags) => {
    const parts = [];
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  };

  const openInMaps = (lat, lng, name) => {
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`;
    window.open(url, '_blank');
  };

  const getDirections = (lat, lng) => {
    if (location) {
      const url = `https://www.openstreetmap.org/directions?from=${location.lat},${location.lng}&to=${lat},${lng}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Nearby Medical Facilities
        </h2>
        <span className="text-sm text-gray-500">Powered by OpenStreetMap</span>
      </div>

      {!location && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🏥</div>
          <p className="text-gray-600 mb-4">
            Find hospitals, clinics, and doctors near your current location
          </p>
          <button
            onClick={getCurrentLocation}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Detecting Location...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Find Nearby Hospitals
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {location && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              📍 Your Location: <span className="font-medium">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
            </p>
            <div className="flex gap-2">
              <select
                value={radius}
                onChange={(e) => {
                  setRadius(Number(e.target.value));
                  fetchNearbyHospitals(location.lat, location.lng, Number(e.target.value));
                }}
                className="text-sm border rounded-lg px-3 py-1"
              >
                <option value={2000}>2 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
                <option value={20000}>20 km</option>
              </select>
              <button
                onClick={() => getCurrentLocation()}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && location && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Searching for nearby medical facilities...</p>
        </div>
      )}

      {hospitals.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            Found {hospitals.length} medical facilities within {radius/1000}km
          </p>
          {hospitals.slice(0, 10).map((hospital) => (
            <div key={hospital.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{hospital.name}</h3>
                    {hospital.emergency && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">
                        🚨 Emergency
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{hospital.type}</p>
                  <p className="text-sm text-gray-600 mt-1">{hospital.address}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-blue-600 font-medium">
                      📏 {hospital.distance.toFixed(1)} km away
                    </span>
                    {hospital.phone && (
                      <span className="text-gray-600">
                        📞 {hospital.phone}
                      </span>
                    )}
                  </div>
                  {hospital.openingHours && (
                    <p className="text-xs text-gray-500 mt-1">
                      🕒 {hospital.openingHours}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => openInMaps(hospital.lat, hospital.lng, hospital.name)}
                    className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium"
                  >
                    View Map
                  </button>
                  <button
                    onClick={() => getDirections(hospital.lat, hospital.lng)}
                    className="text-green-600 hover:bg-green-50 px-3 py-1 rounded text-sm font-medium"
                  >
                    Directions
                  </button>
                </div>
              </div>
            </div>
          ))}
          {hospitals.length > 10 && (
            <p className="text-center text-sm text-gray-500">
              +{hospitals.length - 10} more facilities found. Increase search radius to see all.
            </p>
          )}
        </div>
      )}

      {location && !loading && hospitals.length === 0 && !error && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-gray-600">
            No medical facilities found within {radius/1000}km
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try increasing the search radius
          </p>
        </div>
      )}
    </div>
  );
}
