/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import CellDiagram from "./CellDiagram";
import React from "react";
import {withStyles} from "@material-ui/core/styles";
import * as PropTypes from "prop-types";


const styles = (theme) => ({
    content: {
        paddingTop: theme.spacing(4)
    }
});

const DependencyDiagram = (props) => {
    const {classes, data} = props;
    const getCellName = (cellData) => `${cellData.org}/${cellData.name}:${cellData.ver}`;
    const diagramData = {
        cells: [getCellName(data)],
        components: data.components.map((component) => (
            {
                cell: getCellName(data),
                name: component
            }
        )),
        dependencyLinks: []
    };

    // Recursively extract dependencies (including transitive dependencies if available)
    const extractData = (cell) => {
        if (cell.dependencies) {
            Object.entries(cell.dependencies).forEach(([alias, dependency]) => {
                const dependencyName = getCellName(dependency);
                if (!diagramData.cells.includes(dependencyName)) {
                    diagramData.cells.push(dependencyName);
                }
                diagramData.dependencyLinks.push({
                    alias: alias,
                    from: getCellName(cell),
                    to: dependencyName
                });

                if (dependency.components) {
                    dependency.components.forEach((component) => {
                        const matches = diagramData.components.find(
                            (datum) => datum.cell === dependencyName && datum.name === component);
                        if (!matches) {
                            diagramData.components.push({
                                cell: dependencyName,
                                name: component
                            });
                        }
                    });
                }

                extractData(dependency);
            });
        }
    };
    extractData(data);

    return (
        <div className={classes.content}>
            <CellDiagram data={diagramData} focusedCell={`${data.org}/${data.name}:${data.ver}`}/>
        </div>
    );
};

DependencyDiagram.propTypes = {
    classes: PropTypes.object.isRequired,
    data: PropTypes.object.isRequired
};

export default withStyles(styles)(DependencyDiagram);