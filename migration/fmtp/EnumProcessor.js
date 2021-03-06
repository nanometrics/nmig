/*
 * This file is a part of "NMIG" - the database migration tool.
 *
 * Copyright 2016 Anatoly Khaytovich <anatolyuss@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program (please see the "LICENSE.md" file).
 * If not, see <http://www.gnu.org/licenses/gpl.txt>.
 *
 * @author Anatoly Khaytovich <anatolyuss@gmail.com>
 */
'use strict';

const connect       = require('./Connector');
const log           = require('./Logger');
const generateError = require('./ErrorGenerator');

/**
 * Define which columns of the given table are of type "enum".
 * Set an appropriate constraint, if need.
 *
 * @param   {Conversion} self
 * @param   {String}     tableName
 * @returns {Promise}
 */
module.exports = function(self, tableName) {
    return connect(self).then(() => {
        return new Promise(resolve => {
            log(self, '\t--[processEnum] Defines "ENUMs" for table "' + self._schema + '"."' + tableName + '"', self._dicTables[tableName].tableLogPath);
            let processEnumPromises = [];

            for (let i = 0; i < self._dicTables[tableName].arrTableColumns.length; ++i) {
                if (self._dicTables[tableName].arrTableColumns[i].Type.indexOf('(') !== -1) {
                    let arrType = self._dicTables[tableName].arrTableColumns[i].Type.split('(');

                    if (arrType[0] === 'enum') {
                        processEnumPromises.push(
                            new Promise(resolveProcessEnum => {
                                self._pg.connect((error, client, done) => {
                                    if (error) {
                                        let msg = '\t--[processEnum] Cannot connect to PostgreSQL server...\n' + error;
                                        generateError(self, msg);
                                        resolveProcessEnum();
                                    } else {
                                        let sql = 'ALTER TABLE "' + self._schema + '"."' + tableName + '" '
                                                + 'ADD CHECK ("' + self._dicTables[tableName].arrTableColumns[i].Field + '" IN (' + arrType[1] + ');';

                                        client.query(sql, err => {
                                            done();

                                            if (err) {
                                                let msg = '\t--[processEnum] Error while setting ENUM for "' + self._schema + '"."'
                                                        + tableName + '"."' + self._dicTables[tableName].arrTableColumns[i].Field + '"...\n' + err;

                                                generateError(self, msg, sql);
                                                resolveProcessEnum();
                                            } else {
                                                let success = '\t--[processEnum] Set "ENUM" for "' + self._schema + '"."' + tableName
                                                            + '"."' + self._dicTables[tableName].arrTableColumns[i].Field + '"...';

                                                log(self, success, self._dicTables[tableName].tableLogPath);
                                                resolveProcessEnum();
                                            }
                                        });
                                    }
                                });
                            })
                        );
                    }
                }
            }

            Promise.all(processEnumPromises).then(() => resolve());
        });
    });
};
