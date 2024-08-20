'use strict';
const BaseGenerator = require('../base-generator');
const constants = require('../constants');
const _ = require('lodash');
const fs = require('fs-extra');

module.exports = class extends BaseGenerator {

    constructor(args, opts) {
        super(args, opts);
        this.configOptions = this.options.configOptions || {};

        this.option("entity-name", {
            type: String,
            description: "Entity name"
        });

        this.option('template-file', {
            type: String,
            description: "Template file path"
        });

        this.option('base-path', {
            type: String,
            desc: "Base URL path for REST Controller"
        })

        this._validateOptions();
    }

    get initializing() {
        this.logSuccess('Generating JPA entity, repository, service and controller');
        return {
            validateEntityName() {
                const context = this.context;
                console.log(`EntityName: ${this.options.entityName}, basePath: ${this.options.basePath}, template-file: ${this.options.templateFile}`);
                //this.env.error("The entity name is invalid");
            }
        }
    }

    /*get prompting() {
        return prompts.prompting;
    }*/

    configuring() {
        this.configOptions = Object.assign({}, this.configOptions, this.config.getAll());
        this.configOptions.basePath = this.options['base-path'];
        this.configOptions.entityName = this.options['entity-name']; //this.options.entityName;
        this.configOptions.entityVarName = _.camelCase(this.options.entityName);
        this.configOptions.tableName = _.snakeCase(this.options.entityName)+'s';
        this.configOptions.doesNotSupportDatabaseSequences =
            this.configOptions.databaseType === 'mysql';
        this.configOptions.formatCode = this.options.formatCode !== false
        this.configOptions.templateFile = this.options['template-file'];
        const { tableName, columns } = this._parse(this.options['template-file']);
        this.configOptions.columns = columns;

        if (!this.configOptions.entityName) {
            const tableNameCamelCase = _.camelCase(tableName).replace(/ /g, '').replace(/s$/, '');
            this.configOptions.entityName = _.startCase(tableNameCamelCase).replace(/ /g, ''); // PascalCase
            this.configOptions.entityVarName = tableNameCamelCase;
            this.configOptions.tableName = _.snakeCase(tableName);
        }
    }

    writing() {
        this._generateAppCode(this.configOptions);
        this._generateDbMigrationConfig(this.configOptions)
    }

    end() {
        if(this.configOptions.formatCode !== false) {
            this._formatCode(this.configOptions, null);
        }
    }

    getcamelCase(text) {
        return _.camelCase(text);
    }

    getSnakeCase(text) {
        return _.snakeCase(text);
    }

    _generateAppCode(configOptions) {
        const mainJavaTemplates = [
            {src: 'entities/Entity.java', dest: 'entities/'+configOptions.entityName+'.java'},
            {src: 'exception/NotFoundException.java', dest: 'exception/'+configOptions.entityName+'NotFoundException.java'},
            {src: 'mapper/Mapper.java', dest: 'mapper/'+configOptions.entityName+'Mapper.java'},
            {src: 'model/query/FindQuery.java', dest: 'model/query/Find'+configOptions.entityName+'sQuery.java'},
            {src: 'model/request/Request.java', dest: 'model/request/'+configOptions.entityName+'Request.java'},
            {src: 'model/response/Response.java', dest: 'model/response/'+configOptions.entityName+'Response.java'},
            {src: 'repositories/Repository.java', dest: 'repositories/'+configOptions.entityName+'Repository.java'},
            {src: 'services/Service.java', dest: 'services/'+configOptions.entityName+'Service.java'},
            {src: 'web/controllers/Controller.java', dest: 'web/controllers/'+configOptions.entityName+'Controller.java'},
        ];
        this.generateMainJavaCode(configOptions, mainJavaTemplates);

        const testJavaTemplates = [
            {src: 'web/controllers/ControllerTest.java', dest: 'web/controllers/'+configOptions.entityName+'ControllerTest.java'},
            {src: 'web/controllers/ControllerIT.java', dest: 'web/controllers/'+configOptions.entityName+'ControllerIT.java'},
            {src: 'services/ServiceTest.java', dest: 'services/'+configOptions.entityName+'ServiceTest.java'},
        ];
        this.generateTestJavaCode(configOptions, testJavaTemplates);
    }

    _generateDbMigrationConfig(configOptions) {

        if(configOptions.dbMigrationTool === 'flywaydb') {
            this._generateFlywayMigration(configOptions)
        }

        if(configOptions.dbMigrationTool === 'liquibase') {
            this._generateLiquibaseMigration(configOptions);
        }
    }

    _generateFlywayMigration(configOptions) {
        const counter = configOptions[constants.KEY_FLYWAY_MIGRATION_COUNTER] + 1;
        let vendor = configOptions.databaseType;
        const scriptTemplate = configOptions.doesNotSupportDatabaseSequences ?
            "V1__new_table_no_seq.sql" : "V1__new_table_with_seq.sql";

        this.fs.copyTpl(
            this.templatePath('app/src/main/resources/db/migration/flyway/'+scriptTemplate),
            this.destinationPath('src/main/resources/db/migration/'+vendor+
                '/V'+counter+'__create_'+configOptions.tableName+'_table.sql'),
            configOptions
        );
        const flywayMigrantCounter = {
            [constants.KEY_FLYWAY_MIGRATION_COUNTER]: counter
        };
        this.config.set(flywayMigrantCounter);
    }

    _generateLiquibaseMigration(configOptions) {
        const dbFmt = configOptions.dbMigrationFormat;
        const counter = configOptions[constants.KEY_LIQUIBASE_MIGRATION_COUNTER] + 1;
        const scriptTemplate = configOptions.doesNotSupportDatabaseSequences ?
            `01-new_table_no_seq.${dbFmt}` : `01-new_table_with_seq.${dbFmt}`;
        this.fs.copyTpl(
            this.templatePath('app/src/main/resources/db/migration/liquibase/changelog/'+scriptTemplate),
            this.destinationPath('src/main/resources/db/changelog/migration/0'+counter+'-create_'+configOptions.tableName+'_table.'+dbFmt),
            configOptions
        );
        const liquibaseMigrantCounter = {
            [constants.KEY_LIQUIBASE_MIGRATION_COUNTER]: counter
        };
        //const updatedConfig = Object.assign({}, this.config.getAll(), liquibaseMigrantCounter);
        this.config.set(liquibaseMigrantCounter);
    }

    _validateOptions() {
        if (!this.options['entity-name'] && !this.options['template-file']) {
            this.log('Error: You must provide either --entity-name or --template-file.');
            process.exit(1);
        }
    }

    _parse(filePath) {
        try {
            if (filePath.includes('.java')) {
                return this._parseJavaClass(filePath);
            } else if ('.sql') {
                return this._parseSQL(filePath);
            } else {
                throw new Error('Unknown file type');
            }
        } catch (err) {
            console.error(err);
        }
    }

    _parseSQL(sqlFile) {
        const columns = [];
        let tableName = '';
        
        try {
            const sql = fs.readFileSync(sqlFile, 'utf8');

            const tableNameRegex = /CREATE\s+TABLE\s+(\w+)/i;
            const tableNameMatch = tableNameRegex.exec(sql);
            
            if (tableNameMatch) {
                tableName = tableNameMatch[1];
                console.log(`Table name: ${tableName}`);
            } else {
                console.warn('Table name not found');
            }

            const cleanSql = sql.replace(/CREATE\s+TABLE\s+\w+\s*\(/i, '')
                                .replace(/\s*\);$/, '');

            const columnDefinitions = cleanSql.split(/,\s*|\s*\n\s*/);
   
            const columnRegex = /(\w+)\s+(\w+)(?:\s+(?:NOT\s+NULL|NULL))?/i;
    
            columnDefinitions.forEach(definition => {
                const match = columnRegex.exec(definition);
    
                if (match) {
                    const [_, name, type, nullability] = match;

                    const removePattern = /PRIMARY|AUTO_INCREMENT|CONSTRAINT/i;
                    if (removePattern.test(name)) {
                        return;
                    }

                    let javaType;
                    switch (type.toUpperCase()) {
                        case "BIGINT":
                            javaType = "Long";
                            break;
                        case "INT":
                            javaType = "Integer";
                            break;
                        case "DATE":
                            javaType = "Date";
                            break;
                        case "DATETIME":
                        case "TIMESTAMP":
                            javaType = "LocalDateTime";
                            break;
                        case "DOUBLE":
                            javaType = "Double";
                            break;
                        case "FLOAT":
                            javaType = "Float";
                            break;
                        case "VARCHAR":
                        case "CHAR":
                            javaType = "String";
                            break;
                        case "BOOLEAN":
                            javaType = "Boolean";
                            break;
                        case "DECIMAL":
                        case "NUMERIC":
                            javaType = "BigDecimal";
                            break;
                        case "TINYINT":
                            javaType = "Byte";
                            break;
                        case "SMALLINT":
                            javaType = "Short";
                            break;
                        default:
                            javaType = "String"; // Default to String for unknown types
                    }

                    console.log(`column name: ${name}, column type: ${javaType}, nullable: ${isNullable}`);
        
                    columns.push({
                        name,
                        javaType,
                        fieldName: this.getcamelCase(name),
                        nullable: !definition.includes("NOT NULL")
                    });
                }
            });
        } catch (err) {
            console.error(err);
        }
        return { tableName, columns };
    }
    
    _parseJavaClass(javaFile) {
        const columns = [];
        let tableName = '';
    
        try {
            const javaCode = fs.readFileSync(javaFile, 'utf8');
        
            console.log(`Java class input: ${javaCode}`);

            const tableNameRegex = /@Table\s*\(\s*name\s*=\s*"(\w+)"\s*\)/i;
            const tableNameMatch = tableNameRegex.exec(javaCode);
            
            if (tableNameMatch) {
                tableName = tableNameMatch[1];
                console.log(`Table name: ${tableName}`);
            } else {
                console.warn('Table name not found');
            }
    
            const propertyRegex = /(private|protected|public)\s+(\w+)\s+(\w+);/g;
            let match;
        
            while ((match = propertyRegex.exec(javaCode)) !== null) {
                const [_, accessModifier, javaType, fieldName] = match;

                let fieldType;
                switch (javaType.toUpperCase()) {
                    case "LONG":
                        fieldType = "Long";
                        break;
                    case "INTEGER":
                        fieldType = "Integer";
                        break;
                    case "DATE":
                        fieldType = "Date";
                        break;
                    case "DOUBLE":
                        fieldType = "Double";
                        break;
                    case "STRING":
                        fieldType = "String";
                        break;
                    case "BOOLEAN":
                        fieldType = "Boolean";
                        break;
                    case "FLOAT":
                        fieldType = "Float";
                        break;
                    case "CHAR":
                        fieldType = "Character";
                        break;
                    case "BIGDECIMAL":
                        fieldType = "BigDecimal";
                        break;
                    case "BYTE":
                        fieldType = "Byte";
                        break;
                    case "SHORT":
                        fieldType = "Short";
                        break;
                    default:
                        fieldType = "String"; // Default to String for unknown types
                }                

                console.log(`column name: ${fieldName}, column type: ${fieldType}, nullable: true`);
        
                columns.push({
                    name: this.getSnakeCase(fieldName),
                    javaType: fieldType,
                    fieldName: fieldName,
                    nullable: true
                });
            }
        
        } catch (err) {
            console.error(err);
        }
    
        return { tableName, columns };
    }    
};
