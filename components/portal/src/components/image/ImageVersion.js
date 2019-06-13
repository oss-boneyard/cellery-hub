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

import AccessTime from "@material-ui/icons/AccessTime";
import ArrowBack from "@material-ui/icons/ArrowBack";
import CellImage from "../../img/CellImage";
import Constants from "../../utils/constants";
import CustomizedTabs from "../common/CustomizedTabs";
import DependencyDiagram from "./dependencyDiagram";
import Divider from "@material-ui/core/Divider";
import FileCopy from "@material-ui/icons/FileCopyOutlined";
import GetApp from "@material-ui/icons/GetApp";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton/IconButton";
import InputBase from "@material-ui/core/InputBase/InputBase";
import NotFound from "../common/error/NotFound";
import NotificationUtils from "../../utils/common/notificationUtils";
import React from "react";
import Tooltip from "@material-ui/core/Tooltip/Tooltip";
import Typography from "@material-ui/core/Typography";
import classNames from "classnames";
import {withRouter} from "react-router-dom";
import {withStyles} from "@material-ui/core/styles";
import HttpUtils, {HubApiError} from "../../utils/api/httpUtils";
import withGlobalState, {StateHolder} from "../common/state";
import * as PropTypes from "prop-types";
import * as moment from "moment";

const styles = (theme) => ({
    content: {
        paddingTop: theme.spacing(4)
    },
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4)
    },
    cellImage: {
        fontSize: 40,
        color: theme.palette.primary.main
    },
    imageContainer: {
        padding: theme.spacing(3),
        border: "1px solid #999"
    },
    rightPanel: {
        borderLeft: "1px solid #eee"
    },
    elementText: {
        paddingLeft: theme.spacing(1 / 2),
        color: "#666666"
    },
    elementIcon: {
        fontSize: 20,
        color: "#666666"
    },
    summary: {
        display: "block",
        color: "#464646",
        paddingBottom: theme.spacing(2)
    },
    stats: {
        display: "flex"
    },
    spaceLeft: {
        marginLeft: theme.spacing(4)
    },
    rightPanelSubTitle: {
        marginTop: theme.spacing(2),
        color: "#666666",
        fontSize: 12
    },
    copyContainer: {
        display: "flex",
        color: "#ffffff",
        padding: theme.spacing(1)

    },
    copyInput: {
        flexGrow: 1,
        color: "#ffffff",
        fontSize: 13,
        marginLeft: Number(theme.spacing(1 / 2))
    },
    copyInputMultiline: {
        flexGrow: 1,
        color: "#ffffff",
        fontSize: 13
    },
    copyContent: {
        backgroundColor: "#445d6e",
        borderRadius: 5,
        paddingLeft: theme.spacing(1),
        marginTop: theme.spacing(1)
    },
    captionText: {
        color: "#666666",
        marginTop: Number(theme.spacing(1 / 2))
    },
    rightPanelTitle: {
        marginTop: theme.spacing(4)
    },
    sidePanelContent: {
        marginTop: theme.spacing(1)
    },
    chip: {
        marginRight: theme.spacing(1),
        marginBottom: theme.spacing(1)
    },
    copy: {
        fontSize: 16
    },
    title: {
        display: "inline-block"
    }
});

class ImageVersion extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isPullCopiedTooltipOpen: false,
            isRunCopiedTooltipOpen: false,
            isLoading: true,
            isVersionNotFound: false,
            versionData: null
        };

        this.pullCmdRef = React.createRef();
        this.runCmdRef = React.createRef();
    }

    componentDidMount() {
        const self = this;
        const {globalState, match} = self.props;
        const orgName = match.params.orgName;
        const imageName = match.params.imageName;
        const version = match.params.version;

        NotificationUtils.showLoadingOverlay(`Fetching image version "${orgName}/${imageName}:${version}"`,
            globalState);
        self.setState({
            isLoading: true
        });
        HttpUtils.callHubAPI(
            {
                url: `/artifacts/${orgName}/${imageName}/${version}`,
                method: "GET"
            },
            globalState
        ).then((data) => {
            self.setState({
                isLoading: false,
                isVersionNotFound: false,
                versionData: data
            });
            NotificationUtils.hideLoadingOverlay(globalState);
        }).catch((err) => {
            let errorMessage;
            if (err instanceof HubApiError) {
                if (err.getStatusCode() === 404) {
                    self.setState({
                        isVersionNotFound: true
                    });
                    errorMessage = `Image version ${orgName}/${imageName}:${version} not found`;
                } else {
                    errorMessage = err.getMessage();
                }
            } else {
                errorMessage = `Failed to fetch Image version ${orgName}/${imageName}:${version}`;
            }
            self.setState({
                isLoading: false
            });
            NotificationUtils.hideLoadingOverlay(globalState);
            if (errorMessage) {
                NotificationUtils.showNotification(errorMessage, NotificationUtils.Levels.ERROR, globalState);
            }
        });
    }

    copyPullCmdToClipboard = () => {
        if (this.pullCmdRef.current) {
            this.pullCmdRef.current.select();
            document.execCommand("copy");

            this.setState({
                isPullCopiedTooltipOpen: true
            });
        }
    };

    handlePullCmdCopiedTooltipClose = () => {
        this.setState({
            isPullCopiedTooltipOpen: false
        });
    };

    copyRunCmdToClipboard = () => {
        if (this.runCmdRef.current) {
            this.runCmdRef.current.select();
            document.execCommand("copy");

            this.setState({
                isRunCopiedTooltipOpen: true
            });
        }
    };

    handleRunCmdCopiedTooltipClose = () => {
        this.setState({
            isRunCopiedTooltipOpen: false
        });
    };

    render = () => {
        const {classes, history, location, match} = this.props;
        const {isPullCopiedTooltipOpen, isRunCopiedTooltipOpen, isLoading, isVersionNotFound, versionData} = this.state;
        const orgName = match.params.orgName;
        const imageName = match.params.imageName;
        const version = match.params.version;
        const tabs = [
            {
                label: "Dependencies",
                render: () => <DependencyDiagram data={versionData.metadata}/>
            }
        ];

        return (
            <React.Fragment>
                <div className={classes.content}>
                    {
                        (history.length <= 2 || location.pathname === "/")
                            ? null
                            : (
                                <IconButton color={"inherit"} aria-label={"Back"}
                                    onClick={() => history.goBack()}>
                                    <ArrowBack/>
                                </IconButton>
                            )
                    }
                    <Typography variant={"h5"} color={"inherit"} className={classes.title}>
                        {orgName}/{imageName} - {version}
                    </Typography>
                    <Divider/>
                    {
                        isLoading || isVersionNotFound || !versionData
                            ? null
                            : (
                                <div className={classes.container}>
                                    <Grid container spacing={4}>
                                        <Grid item xs={12} sm={8} md={8}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={2} sm={2} md={2}>
                                                    <Grid container justify={"center"}>
                                                        <div className={classes.imageContainer}>
                                                            <CellImage className={classes.cellImage}/>
                                                        </div>
                                                    </Grid>
                                                </Grid>
                                                <Grid item xs={10} sm={10} md={10}>
                                                    <div className={classes.stats}>
                                                        <GetApp className={classes.elementIcon}/>
                                                        <Typography variant={"subtitle2"} color={"inherit"}
                                                            className={classes.elementText}>
                                                            {versionData.pullCount}
                                                        </Typography>
                                                        <AccessTime className={classNames(classes.elementIcon,
                                                            classes.spaceLeft)}/>
                                                        <Typography variant={"body2"} color={"inherit"}
                                                            className={classes.elementText}>
                                                            Last Updated on&nbsp;
                                                            {moment(versionData.updatedTimestamp)
                                                                .format(Constants.Format.DATE_TIME)}
                                                            &nbsp;by {versionData.lastAuthor}
                                                        </Typography>
                                                    </div>

                                                </Grid>
                                                <Grid item xs={12} sm={12} md={12}>
                                                    <CustomizedTabs tabs={tabs}/>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item xs={12} sm={4} md={4} className={classes.rightPanel}>
                                            <Typography variant={"subtitle2"} color={"inherit"}>
                                                Cellery Commands
                                            </Typography>
                                            <Typography variant={"subtitle2"} color={"inherit"}
                                                className={classes.rightPanelSubTitle}>
                                                Pull
                                            </Typography>
                                            <div className={classes.copyContent}>
                                                <div className={classes.copyContainer}>
                                                    <InputBase multiline className={classes.copyInput}
                                                        inputProps={{spellCheck: false}} inputRef={this.pullCmdRef}
                                                        value={`cellery pull ${orgName}/${imageName}:${version}`}/>
                                                    <Tooltip title={"Copied!"} disableFocusListener={false}
                                                        disableHoverListener={false} placement={"top"}
                                                        disableTouchListener={false} open={isPullCopiedTooltipOpen}
                                                        onClose={this.handlePullCmdCopiedTooltipClose}>
                                                        <IconButton color={"inherit"} className={classes.iconButton}
                                                            aria-label={"Copy"} onClick={this.copyPullCmdToClipboard}>
                                                            <FileCopy className={classes.copy}/>
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <Typography variant={"subtitle2"} color={"inherit"}
                                                className={classes.rightPanelSubTitle}>
                                                Run
                                            </Typography>
                                            <div className={classes.copyContent}>
                                                <div className={classes.copyContainer}>
                                                    <InputBase multiline className={classes.copyInputMultiline}
                                                        value={
                                                            `cellery run ${orgName}/${imageName}:${version}`
                                                            + "-n pet-fe -l petStoreBackend:pet-be -d"
                                                        }
                                                        inputProps={{spellCheck: false}} inputRef={this.runCmdRef}/>
                                                    <Tooltip title={"Copied!"} disableFocusListener={false}
                                                        disableHoverListener={false} placement={"top"}
                                                        disableTouchListener={false} open={isRunCopiedTooltipOpen}
                                                        onClose={this.handleRunCmdCopiedTooltipClose}>
                                                        <IconButton color={"inherit"} className={classes.iconButton}
                                                            aria-label={"Copy"} onClick={this.copyRunCmdToClipboard}>
                                                            <FileCopy className={classes.copy}/>
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <Typography variant={"caption"} display={"block"} gutterBottom
                                                color={"inherit"} className={classes.captionText}>
                                                help text for the command
                                            </Typography>
                                            <Typography variant={"subtitle2"} color={"inherit"}
                                                className={classes.rightPanelTitle}>
                                                Labels
                                            </Typography>
                                            <div className={classes.sidePanelContent}>
                                                <Typography variant={"body2"}>
                                                    {
                                                        Object.entries(versionData.metadata.labels)
                                                            .map(([key, value]) => `${key}=${value}`)
                                                    }
                                                </Typography>
                                            </div>
                                        </Grid>
                                    </Grid>
                                </div>
                            )
                    }
                    {
                        isVersionNotFound
                            ? <NotFound title={`Image version ${orgName}/${imageName}:${version} not found`}/>
                            : null
                    }
                </div>
            </React.Fragment>
        );
    }

}

ImageVersion.propTypes = {
    classes: PropTypes.object.isRequired,
    history: PropTypes.shape({
        goBack: PropTypes.func.isRequired
    }),
    location: PropTypes.any.isRequired,
    match: PropTypes.shape({
        params: PropTypes.shape({
            orgName: PropTypes.string.isRequired,
            imageName: PropTypes.string.isRequired,
            version: PropTypes.string.isRequired
        }).isRequired
    }).isRequired,
    globalState: PropTypes.instanceOf(StateHolder).isRequired
};

export default withStyles(styles)(withRouter(withGlobalState(ImageVersion)));
