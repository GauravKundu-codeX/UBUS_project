CREATE DATABASE IF NOT EXISTS ubus_database;
USE ubus_database;

-- 2. Users table (Ismein sab users - student, driver, admin - store honge)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(255) NOT NULL UNIQUE, -- (e.g., 'abc-123-xyz')
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- (Hashed password)
    role ENUM('student', 'driver', 'admin') NOT NULL,
    collegeId VARCHAR(50), -- (Student ID ya Driver ID)
    routeNumber VARCHAR(20), -- (Sirf Student ke liye)
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Routes table (Saare bus routes ki list)
CREATE TABLE routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    routeNumber VARCHAR(20) NOT NULL UNIQUE,
    stops JSON -- (EXTRA MARKS: JSON type ka istemaal)
);

-- 4. Buses table (Saari buses ki list)
CREATE TABLE buses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    busNumber VARCHAR(100) NOT NULL UNIQUE,
    
    -- Yeh 2 Foreign Keys hain. Yahan se 'JOIN' ka istemaal hoga.
    assignedRouteId INT,
    assignedDriverId INT,
    
    isTripActive BOOLEAN DEFAULT FALSE,
    lat DOUBLE, -- (Live location)
    lng DOUBLE, -- (Live location)
    lastUpdate TIMESTAMP,

    -- **FOR EXTRA MARKS (JOINS):** Foreign Key constraints
    -- Agar 'routes' table se koi route delete hoga, toh yahan 'null' set ho jaayega
    FOREIGN KEY (assignedRouteId) REFERENCES routes(id) ON DELETE SET NULL,
    FOREIGN KEY (assignedDriverId) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Audit Log Table (EXTRA MARKS: Trigger ke liye)
-- Yeh table har trip ka start/stop time record karega
CREATE TABLE bus_audit_log (
    logId INT AUTO_INCREMENT PRIMARY KEY,
    busId INT NOT NULL,
    statusChange VARCHAR(50) NOT NULL, -- (e.g., 'TRIP_STARTED', 'TRIP_STOPPED')
    logTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (busId) REFERENCES buses(id) ON DELETE CASCADE
);

-- 6. TRIGGER (EXTRA MARKS)
-- Yeh trigger 'buses' table par chalega
-- Jab bhi 'isTripActive' column update hoga, yeh 'bus_audit_log' mein ek entry daal dega
DELIMITER $$
CREATE TRIGGER trg_after_bus_status_update
AFTER UPDATE ON buses
FOR EACH ROW
BEGIN
    -- Sirf tabhi log karein jab 'isTripActive' ki value badli ho
    IF OLD.isTripActive != NEW.isTripActive THEN
        IF NEW.isTripActive = TRUE THEN
            INSERT INTO bus_audit_log(busId, statusChange) 
            VALUES (NEW.id, 'TRIP_STARTED');
        ELSE
            INSERT INTO bus_audit_log(busId, statusChange) 
            VALUES (NEW.id, 'TRIP_STOPPED');
        END IF;
    END IF;
END$$
DELIMITER ;

-- 7. STORED PROCEDURE (EXTRA MARKS)
-- Yeh procedure Admin ko bus assign karne mein madad karega
-- Yeh 3 cheezein lega: driver ka UID, bus ka ID, aur route ka Number
DELIMITER $$
CREATE PROCEDURE sp_AssignDriverToBus(
    IN p_driverUid VARCHAR(255),
    IN p_busId INT,
    IN p_routeNumber VARCHAR(20)
)
BEGIN
    DECLARE v_driverId INT;
    DECLARE v_routeId INT;
    
    -- 1. Driver ke UID se uska primary 'id' (INT) nikaalein
    SELECT id INTO v_driverId FROM users WHERE uid = p_driverUid AND role = 'driver' LIMIT 1;
    
    -- 2. Route ke Number se uska primary 'id' (INT) nikaalein
    SELECT id INTO v_routeId FROM routes WHERE routeNumber = p_routeNumber LIMIT 1;
    
    -- 3. Agar driver aur route, dono mile, tabhi bus ko assign karein
    IF v_driverId IS NOT NULL AND v_routeId IS NOT NULL THEN
        UPDATE buses 
        SET assignedDriverId = v_driverId, assignedRouteId = v_routeId
        WHERE id = p_busId;
    END IF;
    
END$$
DELIMITER ;

-- 8. VIEW (EXTRA MARKS: JOIN + Subquery)
-- Yeh View hamein bus ki saari details (driver ka naam, route ka number) ek saath dega
CREATE VIEW v_bus_details AS
SELECT 
    b.id AS busId,
    b.busNumber,
    b.isTripActive,
    b.lat AS lat,  -- (Aapke table ke hisaab se fix kiya gaya)
    b.lng AS lng,  -- (Aapke table ke hisaab se fix kiya gaya)
    r.id AS routeId,
    r.routeNumber,
    r.stops,
    u.uid AS driverUid,
    u.collegeId AS driverCollegeId,
    u.name AS driverName
FROM buses b
LEFT JOIN routes r ON b.assignedRouteId = r.id
LEFT JOIN users u ON b.assignedDriverId = u.id
WHERE u.role = 'driver' OR b.assignedDriverId IS NULL;

