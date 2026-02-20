-- Widen generation_jobs columns that were VARCHAR(50) but now store free-form AI text
ALTER TABLE generation_jobs ALTER COLUMN style TYPE TEXT;
ALTER TABLE generation_jobs ALTER COLUMN camera_angle TYPE TEXT;
ALTER TABLE generation_jobs ALTER COLUMN shot_type TYPE TEXT;
