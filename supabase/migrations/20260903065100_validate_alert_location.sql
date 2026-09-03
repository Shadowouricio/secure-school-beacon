-- Alert coordinates must be actual geographic coordinates.
ALTER TABLE public.alertas
  DROP CONSTRAINT IF EXISTS alertas_latitude_valid,
  DROP CONSTRAINT IF EXISTS alertas_longitude_valid,
  ADD CONSTRAINT alertas_latitude_valid
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  ADD CONSTRAINT alertas_longitude_valid
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  ADD CONSTRAINT alertas_coordinates_complete
    CHECK ((latitude IS NULL) = (longitude IS NULL));
