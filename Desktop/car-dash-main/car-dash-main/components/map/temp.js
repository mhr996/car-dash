// This is a temporary file to help with the edit
const handleLocationChange = (lat, lng) => {
    setForm((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
    }));
};
