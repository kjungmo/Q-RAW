const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const asyncify = require('express-asyncify');
const bodyParser = require('body-parser');
const app = asyncify(express());
app.use(bodyParser.urlencoded({
    extended: false
}));
// app.use(express.static('./temp/'))
app.use(express.static(path.join(__dirname, '.temp')));
// app.use('/css', express.static('/node_modules/bootstrap/dist/css'));

const ip = require("ip");
const {
    rootCertificates
} = require('tls');
const {
    response
} = require('express');
const {
    support
} = require('jquery');
const {
    readdir
} = require('fs');
const {
    json
} = require('body-parser');
const {
    NULL
} = require('node-sass');
const hostIp = ip.address();
const localhost = "localhost";
const port = 8080;

const exec = require("child_process").exec;
const execSync = require("child_process").execSync;
const pattern = /(([A-Z]+{)([a-zA-Z]+})==")|([A-Z]+\+=")/g;
const patternDevpath = /(([A-Z]+{)([a-zA-Z]+})==")/g;

let rosnode_array_keys = ["/robot_state_publisher", "/cona", "/servinggo", "/front_laser", "/rear_laser",
    "/laserscan_multi_merger", "/sound_player",
    "/node", "/map_modify", "/rosbridge_websocket", "/tf2_web_republisher", "/depth2laser_node"
];
let grep_regex_rosnode = rosnode_array_keys.join('|');
let rosnode_robot_state_publisher, rosnode_cona;
let rosnode_servinggo, rosnode_front_laser, rosnode_rear_laser, rosnode_laserscan_multi_merger, rosnode_sound_player, rosnode_node;
let rosnode_map_modify;
let rosnode_rosbridge_websocket, rosnode_tf2_web_republisher;
let rosnode_depth2laser_node;
let rosnode_array_values = [rosnode_robot_state_publisher, rosnode_cona, rosnode_servinggo,
    rosnode_front_laser, rosnode_rear_laser, rosnode_laserscan_multi_merger, rosnode_sound_player, rosnode_node,
    rosnode_map_modify, rosnode_rosbridge_websocket, rosnode_tf2_web_republisher, rosnode_depth2laser_node
];

function get_rosnode_list(key_array, value_array) {
    let cmd_rosnode_list = `rosnode list | grep -E '${grep_regex_rosnode}'`;
    // console.log(cmd_rosnode_list);
    const stdout_cmd = exec(cmd_rosnode_list);
    stdout_cmd.stdout.on('data', (data) => {
        console.log(data);
        if (data) {
            for (let i = 0; i < key_array.length; i++) {
                let rosnode_name = key_array[i];
                // console.log(`${rosnode_name} :: ${data}`);
                if (!data.match(rosnode_name)) {
                    value_array[i] = false;
                } else {
                    value_array[i] = true;
                }
            }
        }
    });
    stdout_cmd.stderr.on('data', (data) => {
        console.log(data);
        console.error(data);
    });
}

let remote_checker_result_array;
let update_checker_script_path = '/home/cona/RACE/update_checker.sh';
let remote_checker_path = `/home/cona/remote_checker.txt`;

function get_remote_checker() {
    const stdout_cmd_sh = exec(update_checker_script_path);
    stdout_cmd_sh.stdout.on('data', (data) => {
        fs.readFile(remote_checker_path)
            .then((data2) => {
                // console.log(data2.toString());
                remote_checker_result_array = data2.toString().replace(/\n/g, "").split(' ');
                console.log(remote_checker_result_array);
            })
            .catch((err) => {
                console.error(err);
            });
    });
    stdout_cmd_sh.stderr.on('data', (data) => {
        console.log(data); // to be deleted
        console.error(data);
    });
}

setInterval(get_rosnode_list, 1500, rosnode_array_keys, rosnode_array_values);
setInterval(get_remote_checker, 2000);

app.get("/getRosnodeList", async (req, response) => {
    let data = new Object();
    rosnode_array_keys.forEach((key, i) => data[key] = rosnode_array_values[i]);
    response.send(JSON.stringify(data));
})

app.get("/getRemoteCheckerArray", async (req, response) => {
    let data = new Object();
    if (remote_checker_result_array != undefined) {
        data = remote_checker_result_array;
        console.log(data);
    } else {
        data = {};
    }
    response.send(JSON.stringify(data));
})

let portDevpath = [];
for (let i = 0; i < 10; i++) {
    let cp210x = `udevadm info -a -n /dev/ttyUSB${i} | grep 'DRIVERS' | head -n1`
    const stdout_cp210x = execSync(cp210x).toString();
    if (stdout_cp210x != "" && stdout_cp210x.match("cp210x")) {
        let udevadm = `udevadm info -a -n /dev/ttyUSB${i} | grep '{devpath}' | head -n1`
        const stdout_udevadm = execSync(udevadm).toString();
        if (stdout_udevadm.match("devpath")) {
            let matchedDevpath;
            while (matchedDevpath = pattern.exec(stdout_udevadm) != null) {
                portDevpath.push(stdout_udevadm.substring(pattern.lastIndex, stdout_udevadm.length - 2));
            }
        }
    }
}

const path_home_cona = '/home/cona/data/';
let array_home_cona;
app.get("/getMapBaseFolder", async (req, response) => {
    let data = new Object();
    array_home_cona = [];
    try {
        const folders = await fs.readdir(path_home_cona);
        for (const folder of folders) {
            if (path.extname(path_home_cona + folder) == '') {
                array_home_cona.push(folder);
            }
        }
        console.log(array_home_cona.length);
    } catch (err) {
        console.error(err);
    }
    console.log(array_home_cona);
    data.result = "map folders loaded";
    data.folder = array_home_cona;
    response.send(JSON.stringify(data));
})

let path_home_cona_base;
let array_child_folder;
app.post("/postBaseFolder", async (req, response) => {
    let data2 = new Object();
    array_child_folder = [];
    console.log(req.body);
    let body_parsed = req.body;
    console.log(body_parsed.folder);
    path_home_cona_base = path_home_cona + body_parsed.folder;
    try {
        const folders = await fs.readdir(path_home_cona_base + '/');
        for (const folder of folders) {
            if (path.extname(path_home_cona_base + '/' + folder) == '' && folder.toString().match("Map")) {
                array_child_folder.push(folder);
            }
        }
        console.log(array_child_folder.length);
    } catch (err) {
        console.error(err);
    }
    console.log(array_child_folder);
    data2.result = "child folders loaded";
    data2.folder = array_child_folder;
    response.send(JSON.stringify(data2));
})

let path_home_cona_base_child;
let array_map_pgms;
app.post("/postChildFolder", async (req, response) => {
    let data2 = new Object();
    array_map_pgms = [];
    console.log(req.body);
    let body_parsed = req.body;
    console.log(body_parsed.folder);
    path_home_cona_base_child = path_home_cona_base + '/' + body_parsed.folder;
    try {
        const files = await fs.readdir(path_home_cona_base_child + '/');
        for (const file of files) {
            if (path.extname(file) == '.pgm') {
                array_map_pgms.push(file);
            }
        }
        console.log(array_map_pgms.length);
    } catch (err) {
        console.error(err);
    }
    console.log(array_map_pgms);

    data2.result = "map pgm loaded";
    data2.files = array_map_pgms;
    response.send(JSON.stringify(data2));
})

app.listen(port, hostIp, () => {
    console.log(`Server Running at ${hostIp}:${port}`)
    console.log(`devpath Lists : ${portDevpath}`);
})

let content;
const servinggoRulesFile = '/etc/udev/rules.d/servinggo.rules';
let rulesAttributes = [];
let rulefileSymlink = [];
let rulefileDevpath = [];

// initial point of the .rule file 
fs.readFile(servinggoRulesFile)
    .then((data) => {
        rulesAttributes.splice(0, rulesAttributes.length);
        content = data.toString().replace(/\n/g, ', ').split(", ");
        for (let i = 0; i < content.length; i++) {
            let element = content[i];
            if (element == "") {
                continue;
            } else {
                let list = element.split(", ");
                for (let i = 0; i < list.length; i++) {
                    let attr = list[i];
                    rulesAttributes.push(attr);
                }
            }
        }
        for (let i = 0; i < rulesAttributes.length; i++) {
            let idAttrs = rulesAttributes[i];
            if (idAttrs.match("laser")) {
                let matchArray;
                while (matchArray = pattern.exec(idAttrs) != null) {
                    rulefileSymlink.push(idAttrs.substring(pattern.lastIndex, idAttrs.length - 1));
                }
            } else if (idAttrs.match("devpath")) {
                let matchArray;
                while (matchArray = pattern.exec(idAttrs) != null) {
                    rulefileDevpath.push(idAttrs.substring(pattern.lastIndex, idAttrs.length - 1));
                }
            }
        }
    })
    .catch((err) => {
        console.error(err);
    });

let oneclick_update_script_path = '/home/cona/RACE/oneclick_update.sh';
app.get("/oneclick_updater", async (req, response) => {
    const stdout_cmd_sh = exec(oneclick_update_script_path);
    let data1 = new Object();
    stdout_cmd_sh.stdout.on('data', (data) => {
        console.log(data);
        data1.result = "successfully executed oneclick_update.sh"
        data1.flag = true;
    });
    stdout_cmd_sh.stderr.on('data', (data) => {
        console.log(data); // to be deleted
        console.error(data);
        data1.result = "Failed executing oneclick_update.sh"
        data1.flag = false;
    });
})

let sensor_rgb_imshow = false
let sensor_health_imshow = false
app.get("/sensorRGB1_load", async (req, response) => {
    let data = new Object();
    let root_config_path = '/home/cona/root_config.json'
    fs.readFile(root_config_path)
        .then((data1) => {
            let json_root_config = JSON.parse(data1.toString())
            let config_path = json_root_config.Path.Local_data + "config.json";
            if (json_root_config.Imshow.plot_in_ros === 0) {
                json_root_config.Imshow.plot_in_ros = 1;
                let changedRoot = JSON.stringify(json_root_config, null, 4);
                // console.log(changedRoot);
                fs.writeFile(root_config_path, changedRoot);
            }
            fs.readFile(config_path)
                .then((data2) => {
                    let json_config = JSON.parse(data2.toString());
                    if (json_config.Sensor.RGB1_imshow === 0) {
                        json_config.Sensor.RGB1_imshow = 1;
                        sensor_rgb_imshow = true;
                    }

                    if (json_config.Sensor.imshow === 0) {
                        json_config.Sensor.imshow = 1;
                        sensor_health_imshow = true;
                    }

                    if (sensor_rgb_imshow || sensor_health_imshow) {
                        let changedConfig = JSON.stringify(json_config, null, 4);
                        // console.log(changedConfig);
                        fs.writeFile(config_path, changedConfig);
                    }
                })
                .catch((err2) => {
                    console.error(err2);
                });
        })
        .catch((err1) => {
            console.error(err1);
        });
    data.result = "json successfully loaded";
    response.send(JSON.stringify(data));
})

let sensor_grid_imshow = false
app.get("/sensorGrid_load", async (req, response) => {
    let data = new Object();
    let root_config_path = '/home/cona/root_config.json'
    fs.readFile(root_config_path)
        .then((data1) => {
            let json_root_config = JSON.parse(data1.toString())
            let config_path = json_root_config.Path.Local_data + "config.json";
            if (json_root_config.Imshow.plot_in_ros === 0) {
                json_root_config.Imshow.plot_in_ros = 1;
                let changedRoot = JSON.stringify(json_root_config, null, 4);
                // console.log(changedRoot);
                fs.writeFile(root_config_path, changedRoot);
            }
            fs.readFile(config_path)
                .then((data2) => {
                    let json_config = JSON.parse(data2.toString());
                    if (json_config.Grid.imshow === 0) {
                        json_config.Grid.imshow = 1;
                        sensor_grid_imshow = true;
                    }

                    // if (json_config.Sensor.imshow === 0) {
                    //     json_config.Sensor.imshow = 1;
                    //     sensor_health_imshow = true;
                    // }

                    if (sensor_grid_imshow) {
                        let changedConfig = JSON.stringify(json_config, null, 4);
                        // console.log(changedConfig);
                        fs.writeFile(config_path, changedConfig);
                    }
                })
                .catch((err2) => {
                    console.error(err2);
                });
        })
        .catch((err1) => {
            console.error(err1);
        });
    data.result = "(grid)json successfully loaded";
    response.send(JSON.stringify(data));
})

app.get("/sensor_RGB1", async (req, response) => {
    let data = new Object();
    data.result = "Sensor_RGB1 stream start";
    console.log(data.result);
    response.send(JSON.stringify(data));
})

let laserInfoData = [];
app.get("/initDevpath", async (req, response) => {
    rulesAttributes = [];
    laserInfoData = [];
    rulefileSymlink = [];
    rulefileDevpath = [];

    laserInfoData = await readRulefile(rulesAttributes, rulefileSymlink, rulefileDevpath);

    if (!laserInfoData.length) {
        for (let i = 0; i < portDevpath.length; i++) {
            let data = new Object();
            data.portDevpath = portDevpath[i];
            data.symlink = symlink[i];
            data.rulefileDevpath = devpath[i];

            laserInfoData.push(data);
        }
        var jsonData = JSON.stringify(laserInfoData);
        console.log(jsonData);
        response.send(laserInfoData);
    } else {
        response.send(laserInfoData);
    }
})

// used when after the .rule is changed, GET gets updated .rule's data
async function readRulefile(rulesAttr, symlink, devpath) {
    let data = await fs.readFile(servinggoRulesFile)

    content = data.toString().replace(/\n/g, ', ').split(", ");
    for (let i = 0; i < content.length; i++) {
        let element = content[i];
        if (element == "") {
            continue;
        } else {
            let list = element.split(", ");
            for (let i = 0; i < list.length; i++) {
                let attr = list[i];
                rulesAttr.push(attr);
            }
        }
    }
    for (let i = 0; i < rulesAttr.length; i++) {
        let idAttrs = rulesAttr[i];
        if (idAttrs.match("laser")) {
            let matchArray;
            while (matchArray = pattern.exec(idAttrs) != null) {
                symlink.push(idAttrs.substring(pattern.lastIndex, idAttrs.length - 1));
            }
        } else if (idAttrs.match("devpath")) {
            let matchArray;
            while (matchArray = pattern.exec(idAttrs) != null) {
                devpath.push(idAttrs.substring(pattern.lastIndex, idAttrs.length - 1));
            }
        }
    }
    console.log(`udevadm devpath Lists : ${portDevpath}`);
    console.log(`.rule symlink names : ${symlink}`);
    console.log(`.rule devpath : ${devpath}`);

    let dataArray = [];
    for (let i = 0; i < portDevpath.length; i++) {
        let data = new Object();
        data.portDevpath = portDevpath[i];
        data.symlink = symlink[i];
        data.rulefileDevpath = devpath[i];

        dataArray.push(data);
    }
    return dataArray;
}

app.post("/lidarDevpathChange", async (req, response) => {
    console.log(req.body);
    let body_parsed = req.body;
    console.log(body_parsed.laser1);
    console.log(body_parsed.laser2);
    writeRulefile(body_parsed.laser1, body_parsed.laser2);
    let script_path = '/home/cona/RACE/script.sh';

    const shellScript = exec(script_path);
    shellScript.stdout.on('data', (data) => {
        console.log(data);
        data.result = "successfully executed script.sh"
    });
    shellScript.stderr.on('data', (data) => {
        console.error(data);
        data.result = "failed to execute script.sh"
    });
})

async function writeRulefile(laser1, laser2) {
    let start = new Date().getMilliseconds();
    let newTextArray = await fs.readFile(servinggoRulesFile);
    newTextArray = newTextArray.toString().split("\n");
    let lasers = [laser1, laser2];
    var matchedArgument;
    for (let i = 0; i < newTextArray.length; i++) {
        const elementArray = newTextArray[i];
        if (elementArray != null && elementArray.match("laser")) {
            let elementArrayArgs = elementArray.split(", ");
            for (let j = 0; j < elementArrayArgs.length; j++) {
                const argument = elementArrayArgs[j];
                if (argument.match("devpath")) {
                    let newArgument;
                    while (matchedArgument = patternDevpath.exec(argument) != null) {
                        newArgument = argument.substring(0, patternDevpath.lastIndex) +
                            lasers[i / 2 - 1] +
                            argument.slice(-1);
                    }
                    elementArrayArgs[j] = newArgument;
                }
            }
            newTextArray[i] = elementArrayArgs.join(', ');
        }
    }

    let filename = '/home/cona/RACE/servinggo.rules'
    await fs.writeFile(filename, newTextArray.join('\n'), {
            encoding: 'utf-8',
            flag: "w",
            mode: 0o644
        },
        (err) => {
            if (err) {
                console.log("error");
            } else {
                console.log("written complete");
            }
        });

    let end = new Date().getMilliseconds();
    let time = end - start;
    console.log(`Execution time of writeRulefile : ${time}`);
}

const sound_test = '/home/cona/RACE/servinggo_speaker_test.wav';
app.get("/checkSpeaker", async (req, response) => {
    fs.readFile(sound_test)
        .then((sound) => {
            let data = new Object();
            data.result = 1;
            data.dir = sound_test;
            console.log("speaker on");
            response.send(JSON.stringify(data));
        })
        .catch((err) => {
            let data = new Object();
            data.result = 0;
            data.dir = null;
            console.log("Cannot find sound_test file")
        })
})

app.get("/driveTest", async (req, response) => {
    const forwardVel = `rostopic pub -1 /cmd_vel geometry_msgs/Twist '[0.05, 0.0, 0.0]' '[0.0, 0.0, 0.0]'`;
    const sleep6 = `sleep 6`;
    const stopVel = `rostopic pub -1 /cmd_vel geometry_msgs/Twist '[0.0, 0.0, 0.0]' '[0.0, 0.0, 0.0]'`
    const sleep1 = `sleep 1`;
    const turnVel = `rostopic pub -1 /cmd_vel geometry_msgs/Twist '[0.0, 0.0, 0.0]' '[0.0, 0.0, 0.3]'`;

    const rosCommand = forwardVel + " && " + sleep6 + " && " + stopVel + " && " + sleep1 + " && " + turnVel + " && " + sleep1 + " && " + stopVel + " && " + forwardVel + " && " + sleep6 + " && " + stopVel;
    exec(rosCommand);
    let data = new Object();
    data.result = "Odom testing(Straight->Turn)";
    console.log("start odom test")
    response.send(JSON.stringify(data));
})

app.get("/driveStraight", async (req, response) => {
    const forwardVel = `rostopic pub -1 /cmd_vel geometry_msgs/Twist '[0.6, 0.0, 0.0]' '[0.0, 0.0, 0.0]'`;

    const rosCommand = forwardVel;
    exec(rosCommand);
    let data = new Object();
    data.result = "Odom testing(Straight~)";
    console.log("Drive straight test")
    response.send(JSON.stringify(data));
})

app.get("/driveStop", async (req, response) => {
    const stopVel = `rostopic pub -1 /cmd_vel geometry_msgs/Twist '[0.0, 0.0, 0.0]' '[0.0, 0.0, 0.0]'`

    const rosCommand = stopVel;
    exec(rosCommand);
    let data = new Object();
    data.result = "Odom testing(Stop)";
    console.log("Drive stop test")
    response.send(JSON.stringify(data));
})

let cbCamera = 0;
let cbLidar = 0;
let cbDepth = 0;
let cbLED = 0;
let cbOdom = 0;

app.get("/checkboxDashboard", async (req, response) => {
    let data = new Object();
    data.camera = cbCamera;
    data.lidar = cbLidar;
    data.depth = cbDepth;
    data.led = cbLED;
    data.odom = cbOdom;
    console.log("Loading checkbox vals to dashboard");
    response.send(JSON.stringify(data));
})

app.post("/checkboxCamera", async (req, response) => {
    console.log(req.body);
    cbCamera = req.body.checkbox;
    console.log(cbCamera);
})

app.post("/checkboxLidar", async (req, response) => {
    console.log(req.body);
    cbLidar = req.body.checkbox;
    console.log(cbLidar);
})

app.post("/checkboxDepth", async (req, response) => {
    console.log(req.body);
    cbDepth = req.body.checkbox;
    console.log(cbDepth);
})

app.post("/checkboxLED", async (req, response) => {
    console.log(req.body);
    cbLED = req.body.checkbox;
    console.log(cbLED);
})

app.post("/checkboxOdom", async (req, response) => {
    console.log(req.body);
    cbOdom = req.body.checkbox;
    console.log(cbOdom);
})
