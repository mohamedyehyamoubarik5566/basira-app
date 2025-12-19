// Database Schema Manager - Handles Migrations and Compatibility
class SchemaManager {
    constructor() {
        this.supabase = null;
        this.currentSchema = SystemConfig.version.schemaVersion;
        this.migrationLog = [];
    }

    async initialize() {
        this.supabase = initializeSupabase();
        if (!this.supabase) {
            console.warn('Supabase not available, skipping schema migration');
            return;
        }
        
        await this.checkAndMigrate();
    }

    // Main schema checking and migration function
    async checkAndMigrate() {
        if (!SystemConfig.system.autoMigration) {
            console.log('Auto-migration disabled');
            return;
        }

        try {
            this.showMigrationStatus('بدء فحص قاعدة البيانات...');
            
            for (const [tableName, schema] of Object.entries(SystemConfig.requiredSchema)) {
                await this.ensureTableExists(tableName, schema);
                await this.addMissingColumns(tableName, schema.newColumns || {});
            }
            
            await this.updateSchemaVersion();
            this.showMigrationStatus('تم تحديث قاعدة البيانات بنجاح', 'success');
            
        } catch (error) {
            console.error('Schema migration failed:', error);
            this.showMigrationStatus('فشل في تحديث قاعدة البيانات', 'error');
        }
    }

    // Ensure table exists with basic structure
    async ensureTableExists(tableName, schema) {
        try {
            // Check if table exists by trying to select from it
            const { data, error } = await this.supabase
                .from(tableName)
                .select('id')
                .limit(1);

            if (error && error.code === 'PGRST116') {
                // Table doesn't exist, create it
                await this.createTable(tableName, schema.columns);
                this.logMigration(`Created table: ${tableName}`);
            }

        } catch (error) {
            console.error(`Error checking table ${tableName}:`, error);
        }
    }

    // Create table with basic columns
    async createTable(tableName, columns) {
        const createSQL = this.generateCreateTableSQL(tableName, columns);
        
        try {
            const { error } = await this.supabase.rpc('execute_sql', {
                sql_query: createSQL
            });

            if (error) {
                console.error(`Failed to create table ${tableName}:`, error);
            } else {
                this.logMigration(`Successfully created table: ${tableName}`);
            }

        } catch (error) {
            console.error(`Error creating table ${tableName}:`, error);
        }
    }

    // Add missing columns to existing tables
    async addMissingColumns(tableName, newColumns) {
        for (const [columnName, columnType] of Object.entries(newColumns)) {
            try {
                await this.addColumnIfNotExists(tableName, columnName, columnType);
            } catch (error) {
                console.error(`Error adding column ${columnName} to ${tableName}:`, error);
            }
        }
    }

    // Add single column if it doesn't exist
    async addColumnIfNotExists(tableName, columnName, columnType) {
        try {
            // Check if column exists by querying information_schema
            const { data, error } = await this.supabase.rpc('check_column_exists', {
                table_name: tableName,
                column_name: columnName
            });

            if (!error && !data) {
                // Column doesn't exist, add it
                const alterSQL = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};`;
                
                const { error: alterError } = await this.supabase.rpc('execute_sql', {
                    sql_query: alterSQL
                });

                if (!alterError) {
                    this.logMigration(`Added column ${columnName} to ${tableName}`);
                }
            }

        } catch (error) {
            console.error(`Error checking/adding column ${columnName}:`, error);
        }
    }

    // Generate CREATE TABLE SQL
    generateCreateTableSQL(tableName, columns) {
        const baseColumns = [
            'id BIGSERIAL PRIMARY KEY',
            'created_at TIMESTAMPTZ DEFAULT NOW()',
            'updated_at TIMESTAMPTZ DEFAULT NOW()'
        ];

        // Add company_code to all tables except system tables
        if (!['system_config', 'migrations'].includes(tableName)) {
            baseColumns.push('company_code TEXT NOT NULL');
        }

        // Add custom columns
        const customColumns = columns
            .filter(col => !['id', 'created_at', 'updated_at'].includes(col))
            .map(col => `${col} TEXT`);

        const allColumns = [...baseColumns, ...customColumns];

        return `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                ${allColumns.join(',\n                ')}
            );
            
            -- Enable RLS
            ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;
            
            -- Create RLS policy for company isolation
            CREATE POLICY IF NOT EXISTS "${tableName}_company_isolation" 
            ON ${tableName} 
            FOR ALL 
            USING (company_code = current_setting('app.current_company_code', true));
            
            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_${tableName}_company_code ON ${tableName}(company_code);
            CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at);
        `;
    }

    // Update schema version in database
    async updateSchemaVersion() {
        try {
            const { error } = await this.supabase
                .from('system_config')
                .upsert({
                    key: 'schema_version',
                    value: this.currentSchema,
                    updated_at: new Date().toISOString()
                });

            if (!error) {
                this.logMigration(`Updated schema version to ${this.currentSchema}`);
            }

        } catch (error) {
            console.error('Error updating schema version:', error);
        }
    }

    // Log migration activities
    logMigration(message) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            message: message,
            schema_version: this.currentSchema
        };
        
        this.migrationLog.push(logEntry);
        console.log(`[Schema Migration] ${message}`);
    }

    // Show migration status to user
    showMigrationStatus(message, type = 'info') {
        if (typeof window !== 'undefined') {
            const statusElement = document.getElementById('migration-status');
            if (statusElement) {
                statusElement.textContent = message;
                statusElement.className = `migration-status ${type}`;
            } else {
                // Create temporary status display
                const status = document.createElement('div');
                status.id = 'migration-status';
                status.className = `migration-status ${type}`;
                status.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(138, 43, 226, 0.9);
                    color: white;
                    padding: 20px 30px;
                    border-radius: 12px;
                    font-family: 'Cairo', sans-serif;
                    z-index: 10000;
                    backdrop-filter: blur(10px);
                `;
                status.textContent = message;
                document.body.appendChild(status);

                if (type === 'success' || type === 'error') {
                    setTimeout(() => status.remove(), 3000);
                }
            }
        }
    }

    // Get migration history
    getMigrationLog() {
        return this.migrationLog;
    }

    // Force schema check (for manual triggers)
    async forceSchemaCheck() {
        await this.checkAndMigrate();
    }
}

// Required SQL functions for Supabase
const REQUIRED_SQL_FUNCTIONS = `
-- Function to execute dynamic SQL
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if column exists
CREATE OR REPLACE FUNCTION check_column_exists(table_name TEXT, column_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create system_config table if not exists
CREATE TABLE IF NOT EXISTS system_config (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

// Initialize schema manager
let schemaManager = null;

function initializeSchemaManager() {
    if (!schemaManager) {
        schemaManager = new SchemaManager();
    }
    return schemaManager;
}

// Export for global use
if (typeof window !== 'undefined') {
    window.SchemaManager = SchemaManager;
    window.initializeSchemaManager = initializeSchemaManager;
    window.REQUIRED_SQL_FUNCTIONS = REQUIRED_SQL_FUNCTIONS;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SchemaManager, initializeSchemaManager, REQUIRED_SQL_FUNCTIONS };
}