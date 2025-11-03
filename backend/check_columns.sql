SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name IN ('isManagedModeEnabled', 'id')
ORDER BY column_name;
