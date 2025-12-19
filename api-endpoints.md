# API Endpoints for Centralized ERP Architecture

## Required Vercel API Routes

### 1. Maintenance Status Endpoint
**File:** `/api/maintenance-status.js`
```javascript
export default function handler(req, res) {
    // Check maintenance mode from environment or database
    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    
    res.status(200).json({
        maintenance: maintenanceMode,
        message: maintenanceMode ? 'System under maintenance' : 'System operational',
        timestamp: new Date().toISOString()
    });
}
```

### 2. Version Check Endpoint
**File:** `/api/version.js`
```javascript
export default function handler(req, res) {
    const version = process.env.APP_VERSION || '2026.1.1';
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();
    
    res.status(200).json({
        version: version,
        buildTime: buildTime,
        hotSwapEnabled: true,
        schemaVersion: '1.0.0'
    });
}
```

### 3. Schema Migration Endpoint
**File:** `/api/migrate-schema.js`
```javascript
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );

    try {
        // Run schema migrations
        const migrations = req.body.migrations || [];
        const results = [];

        for (const migration of migrations) {
            const { data, error } = await supabase.rpc('execute_sql', {
                sql_query: migration.sql
            });

            results.push({
                migration: migration.name,
                success: !error,
                error: error?.message
            });
        }

        res.status(200).json({
            success: true,
            results: results
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
```

## Environment Variables for Vercel

```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
APP_VERSION=2026.1.1
BUILD_TIME=2024-12-19T10:00:00Z
MAINTENANCE_MODE=false
```

## Deployment Structure

```
basira-erp/
├── public/
│   ├── system-config.js          # Stable bridge (rarely changes)
│   ├── schema-manager.js         # Schema management
│   ├── maintenance-manager.js    # Maintenance & hot-swap
│   ├── app-loader.js            # Dynamic app loader
│   ├── index.html               # Main app (versioned)
│   ├── login.html               # Login portal (versioned)
│   └── assets/                  # Versioned assets
├── api/
│   ├── maintenance-status.js    # Maintenance check
│   ├── version.js              # Version info
│   └── migrate-schema.js       # Schema migrations
└── vercel.json                 # Deployment config
```

## Vercel Configuration

**File:** `vercel.json`
```json
{
    "functions": {
        "api/**/*.js": {
            "runtime": "nodejs18.x"
        }
    },
    "headers": [
        {
            "source": "/(.*)",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "public, max-age=0, must-revalidate"
                }
            ]
        },
        {
            "source": "/system-config.js",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "public, max-age=31536000, immutable"
                }
            ]
        }
    ],
    "rewrites": [
        {
            "source": "/api/maintenance",
            "destination": "/api/maintenance-status"
        }
    ]
}
```

## Hot-Swap Implementation

### 1. Asset Versioning
All dynamic assets (HTML, CSS, JS) should include version parameters:
- `index.html?v=2026.1.1`
- `script.js?v=2026.1.1`
- `style.css?v=2026.1.1`

### 2. Cache Strategy
- **system-config.js**: Long-term cache (immutable)
- **Dynamic assets**: No cache (always fresh)
- **API responses**: No cache

### 3. Update Process
1. Deploy new code to Vercel
2. Update APP_VERSION environment variable
3. Clients automatically detect version change
4. Hot-swap triggers asset reload
5. Schema migrations run if needed

## Database Setup

### Required SQL Functions
```sql
-- Execute dynamic SQL (for migrations)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set configuration for RLS
CREATE OR REPLACE FUNCTION set_config(
    setting_name TEXT,
    setting_value TEXT,
    is_local BOOLEAN DEFAULT false
)
RETURNS TEXT AS $$
BEGIN
    PERFORM set_config(setting_name, setting_value, is_local);
    RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check column existence
CREATE OR REPLACE FUNCTION check_column_exists(
    table_name TEXT,
    column_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This architecture ensures:
- ✅ **Separation of Concerns**: System updates vs Company data
- ✅ **Zero Downtime**: Hot-swap without session loss
- ✅ **Data Safety**: Schema migrations without data loss
- ✅ **Scalability**: Centralized core with distributed data
- ✅ **Maintenance Mode**: Professional user experience during updates