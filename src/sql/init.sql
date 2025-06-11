-- Ensure tables are created in the correct order due to foreign key dependencies

-- users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- markets table
CREATE TABLE IF NOT EXISTS markets (
    id SERIAL PRIMARY KEY,
    image_link TEXT NOT NULL,
    label VARCHAR(255) NOT NULL, -- Corresponds to a title/name for the market
    description VARCHAR(255),
    content TEXT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    website_link TEXT -- Added website link for markets
);

-- vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    image_link TEXT NOT NULL,
    name VARCHAR(255) NOT NULL, -- Corresponds to 'name' in your screenshot
    category VARCHAR(255),      -- From screenshot
    location VARCHAR(255),      -- From screenshot
    contact VARCHAR(255),       -- From screenshot
    email VARCHAR(255),         -- From screenshot
    website TEXT,               -- New: website for vendor, similar to markets
    markets TEXT[],             -- New: Array of market names/IDs a vendor attends (from screenshot, e.g., ["Calgary Farmers Market"])
    products TEXT[],            -- New: Array of products a vendor sells (from screenshot, e.g., ["Carrots"])
    description VARCHAR(255),
    content TEXT
);

-- articles table
CREATE TABLE IF NOT EXISTS articles (
    post_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL, -- Foreign Key to users.id
    market_id INTEGER,        -- New: Foreign Key to markets.id, nullable if an article isn't always market-specific
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE SET NULL -- Set NULL if market is deleted
);

-- favourite_markets table (linking users to markets)
CREATE TABLE IF NOT EXISTS favourite_markets (
    user_id INTEGER NOT NULL,
    market_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, market_id), -- Composite primary key to ensure unique favourite for a user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE
);

-- favourite_vendors table (linking users to vendors)
CREATE TABLE IF NOT EXISTS favourite_vendors (
    user_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, vendor_id), -- Composite primary key to ensure unique favourite for a user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);