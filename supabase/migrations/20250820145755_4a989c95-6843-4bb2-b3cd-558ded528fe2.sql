-- Enable password strength and leaked password protection
UPDATE auth.config 
SET value = 'true' 
WHERE parameter = 'password_min_length';

UPDATE auth.config 
SET value = '6' 
WHERE parameter = 'password_min_length';

-- Enable leaked password protection
INSERT INTO auth.config (parameter, value) VALUES ('password_breach_guard_enabled', 'true')
ON CONFLICT (parameter) DO UPDATE SET value = 'true';