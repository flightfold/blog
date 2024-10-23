//Coordinate frame for three.js
//Y up Z back and x right
var container = null;
var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
var canvas = renderer.domElement; //renderer creates the canvas element
 

var default_view = null;
var mouseDown = false,
    mouseX = 0,
    mouseY = 0;
    
var cameras = [];
var objects = [];
var lasers = [];
var robots = [];
var checkerboards = [];

var controls = null;
var expand_default_view = false;
var cam_pos_incre = 0;
var gui = null;

var default_hfov = 90;
var default_aspect = 1.3;

var cameras_ctrl = null;
var objects_ctrl = null;
var robots_ctrl = null;
var lasers_ctrl = null;
var checkerboards_ctrl = null;

//list of objects for ray casting for the laser
var laser_objs = [];

//function handle to call whenever objects move in the scene
var laser_update_callbacks = [];

//stores as many renderers as cameras, used for generating the camera images
var camera_frame_renderers = [];

var show_config_loader = false;

main();

// new ResizeSensor(container,function(){
//     renderer.setSize( container.offsetWidth, container.offsetHeight);
// });
window.onload = () => {
    renderer.setSize( container.offsetWidth, container.offsetHeight*(2));
};

function main() {

    //add event listener for config file selector
    const fileSelector = document.getElementById('file-selector');
    fileSelector.addEventListener('change', (event) => {
        const fileList = event.target.files;

        //read each of the files and make sense of the objects
        for(var i=0;i<fileList.length;i++) {
            const reader = new FileReader();
            if (fileList[i].name.startsWith('cameras')) {
                reader.addEventListener('load',(event)=> {
                    console.log("Construct cameras");
                    camera_config = JSON.parse(event.target.result);  
                    for(var i=0;i<camera_config.length;i++) {
                        create_camera_views(camera_config[i]);
                    }
                });
                reader.readAsText(fileList[i]);                    
            
            } else if(fileList[i].name.startsWith('lasers')) {
                reader.addEventListener('load',(event)=> {
                    console.log("Construct lasers");
                    laser_config = JSON.parse(event.target.result);
                    for(var i=0;i<laser_config.length;i++) {
                        add_laser(laser_config[i]);
                    }
                });
                reader.readAsText(fileList[i]);                    
             
            } else if(fileList[i].name.startsWith('objects')) {
                reader.addEventListener('load',(event)=> {
                    console.log("Construct objects");
                    obj_config = JSON.parse(event.target.result);
                    for(var i=0;i<obj_config.length;i++) {
                        add_object(obj_config[i]);
                    }
                });
                reader.readAsText(fileList[i]);                    
            }
        }
    });

    container = document.querySelector('#perception_simulator');

    //Add event listeners to the buttons
    var buttons = document.getElementsByTagName("button");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click", onButtonClick, false);
    };

    addMouseHandler(container);
 
    create_canvas();

    add_controls();

    add_ground();

    create_default_view();
    set_trackball_params(default_view);

    add_light(1,-4,-2,4);
    add_light(1,4,-2,4);

    //register the animate function that will update the scene
    requestAnimationFrame(animate);

    //create the robot before creating the camera views
    create_robot();

    //create a sample camera to start working
    //create_camera_views(get_default_camera());
    //add_object(get_default_object());

}

function set_trackball_params(view) {
    controls = new THREE.TrackballControls(view,renderer.domElement);
    controls.rotateSpeed = 10.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
}

function create_canvas() {

    container.appendChild(canvas);

    renderer.setPixelRatio( window.devicePixelRatio );

    //this block of code makes the canvas to stretch the whole window
    // var ctx = canvas.getContext('2d');
    // ctx.canvas.width  = window.innerWidth;
    // ctx.canvas.height = window.innerHeight*0.9;
}

function add_controls() {

    //generate actions for buttons
    var actions = { 
        add_camera_action:function(){ 
            cam_pos_incre += 0.5;
            create_camera_views(get_default_camera()); 
        },
        add_object_action:function() {
            add_object(get_default_object());
        },
        add_laser_action:function() {
            add_laser(get_default_laser());
        },
        add_checkerboard_action:function() {
            add_checkerboard();
        },
        expand_view_action:function() {
            toggle_view();
        },
        config_loader_action:function() {
            load_config();
        },
        snapshot_scene_action:function() {
            snapshot_scene();
        }
    };

    //create the controls to manipulate the parameters
    const gui = new dat.GUI();

    //create button for toggling view
    gui.add(actions,'expand_view_action').name('Toggle View');
    
    //add button and controls for camera
    cameras_ctrl = gui.addFolder('Cameras');
    cameras_ctrl.add(actions,'add_camera_action').name('Add Camera'); 
    cameras_ctrl.open();

    //add button and controls for laser
    lasers_ctrl = gui.addFolder('Lasers');
    lasers_ctrl.add(actions,'add_laser_action').name('Add Laser');
    lasers_ctrl.open();

    //add button and controls for object
    objects_ctrl = gui.addFolder('Objects');
    objects_ctrl.add(actions,'add_object_action').name('Add Object');
    objects_ctrl.open();

    //add button and controls for checkerboard
    checkerboards_ctrl = gui.addFolder('Checkerboards');
    checkerboards_ctrl.add(actions,'add_checkerboard_action').name('Add Checkerboard');
    checkerboards_ctrl.open();
    
    //add controls for robot
    robots_ctrl = gui.addFolder('Robot');

    //add button for creating a snapshot of the scene
    gui.add(actions,'snapshot_scene_action').name('Snapshot Scene');

    //add button for showing config loader
    gui.add(actions,'config_loader_action').name('Load Config');

    //set the controls as the child of the container
    container.appendChild(gui.domElement);
    
}


function add_ground() {
    var grid = new THREE.GridHelper(10, 100);
    grid.name = "ground_grid";
    //scene.add(grid);
    const basic_material = new THREE.MeshBasicMaterial({
        color: 0xeeeeee, //0xeeeeee,
        name: "ground_grid",
        side: THREE.DoubleSide});
    grid.updateMatrixWorld();

    const gp_w = 100;
    const gp_h = 100;
    const widthSegments = 1;
    const heightSegments = 1;
    const ground_plane_geom = new THREE.PlaneBufferGeometry(gp_w, gp_h, widthSegments, heightSegments);
    var ground_plane_mesh = new THREE.Mesh(ground_plane_geom,basic_material);
    ground_plane_mesh.name = "ground_plane";
    ground_plane_mesh.rotation.x = -Math.PI/2;
    ground_plane_mesh.updateMatrixWorld();

    scene.add(ground_plane_mesh);
    scene.background = new THREE.Color('white');
    //laser_objs.push(grid);
    laser_objs.push(ground_plane_mesh);
}

function create_default_view() {

    const fov = 70;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 1000;
    default_view = new THREE.PerspectiveCamera(fov, aspect, near, far);
    default_view.position.y = 2;
    default_view.position.z = 3;
    //default_view.position.set( <X> , <Y> , <Z> );
    default_view.lookAt(0,0,0);
    renderer.render(scene,default_view);

}

function create_camera_views(config) { 

    var vfov = config.horizontal_FOV/config.aspect;
    var camera = new THREE.PerspectiveCamera(vfov, config.aspect, config.near, config.far);
    camera.position.set(config.position.x,config.position.y,config.position.z);
    camera.lookAt(config.direction.x,config.direction.y,config.direction.z);
    //create a dummy camera with a much closer far field to visualize better
    var helper_camera = new THREE.PerspectiveCamera(vfov,config.aspect,0.1,0.2);
    var helper = new THREE.CameraHelper( helper_camera );
    helper.visible = config.visible;
    scene.add( helper );

    var camera_struct = {
        cam_obj: camera,
        update: null,
        helper: helper,
        helper_camera: helper_camera,
        config: config,
    };

    camera_frame_renderers.push(new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    cameras.push(camera_struct);

    var update_camera = function() {
        //debugger;
        //console.log('x:',camera_struct.position.x, ' y:', camera_struct.position.y, ' z:',camera_struct.position.z);
        //console.log('Camera fov:',camera.fov, ' Struct fov:',camera_struct.vertical_FOV);
        
        //lets set the position and direction as needed. This should work even when the camera is newly created
        camera.position.set(camera_struct.config.position.x, camera_struct.config.position.y, camera_struct.config.position.z);

        //convert verge and tilt angles to radians
        var v = camera_struct.config.rotation.verge * Math.PI/180.0;
        var t = camera_struct.config.rotation.tilt * Math.PI/180.0;

        //verge operation is y rotation (since y is pointing up). Positive verge will be anticlockwise rotation
        //tilt operation is x rotation
        //to calculate the look at direction
        //lets start with a point [0,0,-1] (as negative z is forward)
        var px = 0; 
        var py = 0; 
        var pz = -1;

        //the newdir are obtained by rotating this vector along the verge and tilt angles
        //which in accomplished by multiplying Ry * Rx * p
        //Ry = [cos(v)    0 sin(v)
        //           0    1     0
        //     -sin(v)    0 cos(v)]
        //Rx = [   1      0       0
        //         0 cos(t) -sin(t)
        //         0 sin(t)  cos(t)]
        //p = [px,py,pz]'
        var dirx = Math.cos(v)* px + py*Math.sin(t)*Math.sin(v) + Math.cos(t)*pz*Math.sin(v);
        var diry = Math.cos(t)*py - pz*Math.sin(t);
        var dirz = Math.cos(t)*Math.cos(v)*pz - px*Math.sin(v) + Math.cos(v)*py*Math.sin(t);
        
        //after rotating the unit vector, translate it to the current x,y,z position
        dirx = dirx + camera_struct.config.position.x;
        diry = diry + camera_struct.config.position.y;
        dirz = dirz + camera_struct.config.position.z;
        
        //camera.rotation.verge
        //camera.lookAt(camera_struct.direction.x,camera_struct.direction.y,camera_struct.direction.z);
        camera.lookAt(dirx,diry,dirz);
        camera.aspect = camera_struct.config.aspect;
        camera.fov = camera_struct.config.horizontal_FOV/camera_struct.config.aspect;

        //The camera helper which is used to visualize the camera maintains a separate camera instance so that it can use a different near and 
        //far field
        helper_camera.position.set(camera_struct.config.position.x, camera_struct.config.position.y, camera_struct.config.position.z);
        helper_camera.lookAt(dirx,diry,dirz);
        helper_camera.aspect = camera_struct.config.aspect;
        helper_camera.fov = camera_struct.config.horizontal_FOV/camera_struct.config.aspect;
        helper_camera.updateProjectionMatrix();
        helper.update();

        //update the camera resolution if this is a change of aspect
        //camera_struct.w_pix = Math.floor(camera.aspect * camera_struct.resolution.h_pix);

        camera.updateProjectionMatrix();
        console.log(camera.matrixWorld);
        console.log(camera.projectionMatrix);
    }

    cameras[cameras.length-1].update = update_camera;

    update_camera();
    
    var camctrl = cameras_ctrl.addFolder('Camera '+String(cameras.length));
    camctrl.add(camera_struct.config,'visible').onChange(function(val) { camera_struct.helper.visible = val; });
    camctrl.add(camera_struct.config,'horizontal_FOV',config.horizontal_FOV).min(10).max(180).step(1).onChange(function(val) { camera_struct.config.horizontal_FOV = val; update_camera()});
    camctrl.add(camera_struct.config,'aspect',config.aspect).min(0.5).max(4).step(0.01).onChange(function(val) { camera_struct.config.aspect = val; update_camera()});
    camctrl.add(camera_struct.config,'width_in_pixels',config.width_in_pixels).min(320).max(2096).step(1).onChange(function(val){ camera_struct.config.width_in_pixels = val;});

    //var direction = camctrl.addFolder('Direction');
    //direction.add(camera_struct.direction,'x',look_dir[0]).onChange(function(val) { camera_struct.direction.x = val; update_camera();});
    //direction.add(camera_struct.direction,'y',look_dir[1]).onChange(function(val) { camera_struct.direction.y = val; update_camera();});
    //direction.add(camera_struct.direction,'z',look_dir[2]).onChange(function(val) { camera_struct.direction.z = val; update_camera();});

    var rotation = camctrl.addFolder('Rotation');
    rotation.add(camera_struct.config.rotation,'verge').step(0.1).onChange(function(val) { camera_struct.config.rotation.verge = val; update_camera();});
    rotation.add(camera_struct.config.rotation,'tilt').step(0.1).onChange(function(val) { camera_struct.config.rotation.tilt = val; update_camera();});

    var position = camctrl.addFolder('Position');
    position.add(camera_struct.config.position,'x',config.position.x).min(-10).max(10).step(0.001).onChange(function(val) { camera_struct.config.position.x = val; update_camera();});
    position.add(camera_struct.config.position,'y',config.position.y).min(-10).max(10).step(0.001).onChange(function(val) { camera_struct.config.position.y = val; update_camera();});
    position.add(camera_struct.config.position,'z',config.position.z).min(-20).max(20).step(0.001).onChange(function(val) { camera_struct.config.position.z = val; update_camera();});
    
   //update pose difference between the robot and the camera, 
   //this is assuming the robot is already created
    //this difference should be used during the robot motion
    //ideally it should be a homogeneous transform
    //but since we are just doing translations, it should be ok
    var diff = [camera.position.x - robots[0].config.position.x,
                camera.position.y - robots[0].config.position.y,
                camera.position.z - robots[0].config.position.z];
    robots[0].config.camera_pos_diffs.push(diff);

}

function add_light(intensity, x,y,z) {

    const color = 0xFFFFFF;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x,y,z);
    scene.add(light);
} 

function add_object(config) {
    var geometry;
    if(config.type == 'cube') {
        geometry = new THREE.BoxGeometry(1,1,1); //set the size to 1 and then scale it based on the scale parameter
    } else {
        geometry = new THREE.SphereGeometry(0.5, 32,32); //height and width segments are fixed to 32
    }
    var material = new THREE.MeshPhongMaterial( {color: config.color} );
    var obj = new THREE.Mesh( geometry, material );
    obj.name = config.name;
    obj.position.set(config.position.x,config.position.y,config.position.z);
    obj.scale.set(config.size.x,config.size.y, config.size.z);
    obj.visible = config.visible;

    scene.add( obj );

    var object_struct = {
        obj: obj,
        config: config,
    };

    objects.push(object_struct);

    laser_objs.push(obj);

    var update_object = function() {

        obj.position.set(object_struct.config.position.x, object_struct.config.position.y, object_struct.config.position.z);
        obj.scale.set(object_struct.config.size.x,object_struct.config.size.y, object_struct.config.size.z);

        //update the laser points when the object changes
        for(var l=0;l<laser_update_callbacks.length;l++) {
            laser_update_callbacks[l]();
        }
    }

    var update_color = function(val) {
        material.color = new THREE.Color(val);
    }

    var update_object_type = function(val) {
        //we will probably drop the original geometry and recreate it even if we are choosing the same object.
        //It is probably wasteful. But I couldn't figure out how to get the old values. But it should be ok for the current setup.
        //drop the current geometry and create a new one
        var new_geom = null;
        if(val == 'cube') {
            new_geom = new THREE.BoxGeometry(1,1,1); //set the size to 1 and then scale it based on the scale parameter
        } else {
            new_geom = new THREE.SphereGeometry(0.5, 32,32); //height and width segments are fixed to 32
        }
        object_struct.obj.geometry.dispose();
        object_struct.obj.geometry = new_geom;

        update_object();

        //update the laser points when the object changes
        for(var l=0;l<laser_update_callbacks.length;l++) {
            laser_update_callbacks[l]();
        }
    }
    
    update_object();

    var objctrl = objects_ctrl.addFolder('Object '+String(objects.length));
    objctrl.add(object_struct.config,'type',['cube','sphere']).onChange(function(val) {update_object_type(val)});
    objctrl.addColor(object_struct.config,'color').onChange(function(val){ object_struct.config.color=val; update_color(val)});

    objctrl.add(object_struct.config,'visible').onChange(function(val) { object_struct.obj.visible = val; });


    var position = objctrl.addFolder('Position');
    position.add(object_struct.config.position,'x').onChange(function(val) { object_struct.config.position.x=val; update_object()});
    position.add(object_struct.config.position,'y').onChange(function(val) { object_struct.config.position.y=val; update_object()});;
    position.add(object_struct.config.position,'z').onChange(function(val) { object_struct.config.position.z=val; update_object()});;
    
    var size = objctrl.addFolder('Size');
    size.add(object_struct.config.size,'x').onChange(function(val) { object_struct.config.size.x=val; update_object()});
    size.add(object_struct.config.size,'y').onChange(function(val) { object_struct.config.size.y=val; update_object()});
    size.add(object_struct.config.size,'z').onChange(function(val) { object_struct.config.size.z=val; update_object()});

}

function add_laser(config) {

    var laser = {
        obj: null,
        geom: new THREE.Geometry(),
        rays: [],
        material: new THREE.LineBasicMaterial({color: 0xff0000 }),
        line: new THREE.Line(),
        plane: new THREE.Plane(),
        helper: new THREE.PlaneHelper(),
        dotGeometry: new THREE.Geometry(),
        dotMaterial: new THREE.PointsMaterial( { size: config.point_size, sizeAttenuation: false, color: 0xff0000 } ),
        arrow_helpers: new THREE.Object3D(),
        dots: null,
        points: [],
        config: config,
    };

    lasers.push(laser);

    var clear_rays = function() {
        scene.remove(laser.arrow_helpers);
        laser.arrow_helpers = new THREE.Object3D();
    }

    var update_num_rays = function() {
        //form the rays and store it in the laser object which can be reused 
        //find the angle increments
        var xrot_start = (-laser.config.rotation.pitch+laser.config.field_of_view/2.);
        var xrot_end = (-laser.config.rotation.pitch-laser.config.field_of_view/2.);
        var xrot_incre = (xrot_end - xrot_start)/laser.config.num_rays;
        var xrot = xrot_start;

        laser.rays = [];
        if(laser.config.show_rays) {
            clear_rays();
        }
        var trans = [laser.config.position.x,laser.config.position.y,laser.config.position.z];
        var origin_pt = new THREE.Vector3(laser.config.position.x,laser.config.position.y,laser.config.position.z);
        for(var i=0;i<laser.config.num_rays;i++) {
            
            var rot = rotate_xyz(xrot, laser.config.rotation.yaw, laser.config.rotation.roll);
            xrot += xrot_incre;
            var pt = [0,0,-1];
            var rot_pt = lalolib.mul(rot,pt);
            var dir = new THREE.Vector3(rot_pt[0],rot_pt[1],rot_pt[2]);
            if(laser.config.show_rays) {
                laser.arrow_helpers.add(new THREE.ArrowHelper(dir,origin_pt,1,0x00ff00));
            }
            var ray = new THREE.Raycaster(origin_pt.clone(), dir.clone().normalize());
            laser.rays.push(ray);

        }

        //display the equation of the laser plane on console
        var normal_rot = rotate_xyz(-laser.config.rotation.pitch,laser.config.rotation.yaw,laser.config.rotation.roll);
        laser.config.normal = lalolib.mul(normal_rot,[1,0,0]); // rotate the vector along x axis
        //console.log('Normal to laser plane:',normal);

        
        if(laser.config.show_rays) {
            scene.add(laser.arrow_helpers);
        }

    }

    
    var update_laser_pos = function() {

        var origin_pt = new THREE.Vector3(laser.config.position.x,laser.config.position.y,laser.config.position.z);

        var collision_points = [];
        laser.dotGeometry.vertices = [];
        var total_points = 0;

        scene.remove(laser.dots);
        laser.dots = null;
        laser.dotGeometry = new THREE.Geometry();
        laser.dotMaterial = null;
        laser.dotMaterial = new THREE.PointsMaterial({ size: laser.config.point_size, sizeAttenuation: false, color: 0xff0000 } );
        //for each ray find the collision

        //ignore objects which are not visible
        var collision_objs = [];
        for(var c=0;c<laser_objs.length;c++) {
            if(laser_objs[c].visible) {
                collision_objs.push(laser_objs[c]);
            }
        }

        for(var i=0;i<laser.config.num_rays;i++) {
            var collision = laser.rays[i].intersectObjects(collision_objs);
            total_points += collision.length;
            if(collision.length > 0) {
                //so we got some collision
                for(var j=0;j<collision.length;j++) {
                    //find the vector between the origin and the found points.
                    //find the angle between this vector and the direction vector. If it is off by a bit, ignore that point
                    //this seems to be a bug in the three.js raycaster code. It finds incorrect correspondences.
                    if(collision[j].point.clone().sub(origin_pt).normalize().angleTo(laser.rays[i].ray.direction) < 1e-3) {
                        collision_points.push(collision[j].point);
                        laser.dotGeometry.vertices.push(collision[j].point.clone());
                    }
                        
                }
            }
        }
        
        var coords = '';
        laser.dotGeometry.vertices.forEach(element => coords += element.x+', '+element.y+', '+element.z+'\n');
        laser.points = coords;
        // console.log('Laser'+laser.id);
        // console.log(coords);
        laser.dots = new THREE.Points( laser.dotGeometry, laser.dotMaterial );
        scene.add( laser.dots );

        /*
        scene.remove(laser.line);
        laser.geom = null;
        laser.geom = new THREE.BufferGeometry().setFromPoints(collision_points);
        laser.material = null;
        laser.material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        laser.line = null;
        laser.line = new THREE.Line(laser.geom,laser.material);
        scene.add(laser.line);
        */
        //console.log("Found a total of ",total_points," points and removed ",total_points - collision_points.length );
        
    }

    function update_laser() {
        update_num_rays();
        update_laser_pos();
    }

    update_laser();

    laser_update_callbacks.push(update_laser_pos);


    var laserctrl = lasers_ctrl.addFolder('Laser '+lasers.length);
    laser.config.id = lasers.length;
    //laserctrl.add(laser,'orient_type',['vertical','horizontal']).onChange(function(val) { laser.orient_type = val; update_laser(); });

    laserctrl.add(laser.config,'num_rays').min(1).max(300).onChange(function(val){ laser.config.num_rays = val; update_laser();});
    laserctrl.add(laser.config,'show_rays').onChange(function(val){ laser.config.show_rays = val; clear_rays(); update_laser()});
    laserctrl.add(laser.config,'point_size').min(0.1).max(8).onChange(function(val) { laser.config.point_size = val; clear_rays(); update_laser();});
    laserctrl.add(laser.config,'field_of_view').min(5).max(270).onChange(function(val) { laser.config.field_of_view = val; clear_rays(); update_laser();});
    var position = laserctrl.addFolder('Position');
    position.add(laser.config.position,'x').onChange(function(val) { laser.config.position.x=val; update_laser();});
    position.add(laser.config.position,'y').onChange(function(val) { laser.config.position.y=val; update_laser();});
    position.add(laser.config.position,'z').onChange(function(val) { laser.config.position.z=val; update_laser();});
    
    var rotation = laserctrl.addFolder('Rotation');
    rotation.add(laser.config.rotation,'roll').onChange(function(val) { laser.config.rotation.roll=val; update_laser();});
    rotation.add(laser.config.rotation,'pitch').onChange(function(val) { laser.config.rotation.pitch=val; update_laser();});
    rotation.add(laser.config.rotation,'yaw').onChange(function(val) { laser.config.rotation.yaw=val; update_laser();});

    
}

function add_checkerboard() {

    var checkerboard = {
        geometry: null,
        bg_geometry: null,
        mesh: null,
        bg_mesh: null,
        face_material: null,
        config: {
        position: {x:0, y:1, z:-4},
        rotation: {roll:0, pitch:0, yaw:0},
        white: "#efffff",
        black: "#100000",
        scale: 0.2,
        width: 9,
        height: 7,
        visible: true
        },
    };

    var materialEven = new THREE.MeshBasicMaterial({color: checkerboard.config.black, side: THREE.DoubleSide});
    var materialOdd = new THREE.MeshBasicMaterial({color: checkerboard.config.white, side: THREE.DoubleSide});

    const bg_material = new THREE.MeshBasicMaterial({color: 0xffffff, name: "checker_bg", side: THREE.DoubleSide});

    checkerboard.face_material = []
    checkerboard.face_material.push(materialEven,materialOdd);

    checkerboards.push(checkerboard);

    var update_position = function() {
        checkerboard.bg_mesh.position.set(checkerboard.config.position.x,checkerboard.config.position.y,checkerboard.config.position.z-0.1);
        checkerboard.bg_mesh.rotation.set(-checkerboard.config.rotation.pitch * Math.PI/180.0,
            checkerboard.config.rotation.roll * Math.PI/180.0,checkerboard.config.rotation.yaw * Math.PI/180.0);


        checkerboard.mesh.position.set(checkerboard.config.position.x,checkerboard.config.position.y,checkerboard.config.position.z);
        checkerboard.mesh.rotation.set(-checkerboard.config.rotation.pitch * Math.PI/180.0,
            checkerboard.config.rotation.roll * Math.PI/180.0,checkerboard.config.rotation.yaw * Math.PI/180.0);

    
        //update the laser points when the checkerboard changes
        for(var l=0;l<laser_update_callbacks.length;l++) {
            laser_update_callbacks[l]();
        }
        
    }

    var update_color = function() {
        checkerboard.face_material[0].color = new THREE.Color(checkerboard.black);
        checkerboard.face_material[1].color = new THREE.Color(checkerboard.white);
    }

    var update_checkerboard = function() {

    
        width = checkerboard.config.width;
        height = checkerboard.config.height;
        scale = checkerboard.config.scale;

    
        checkerboard.geometry = null;
        checkerboard.geometry = new THREE.PlaneGeometry(width*scale, height*scale, width, height);

        checkerboard.bg_geometry = null;    
        checkerboard.bg_geometry = new THREE.PlaneBufferGeometry(width*scale+1, height*scale+1,1,1);


        var counter = 0;
        for (var y=0; y < height; y++) {

            for(var x=0; x < 2*width; x++) {
                var i = y * 2 * width + x;
                checkerboard.geometry.faces[i].materialIndex = counter % 2;
                //flip the color only after completing the two triangles that make a square
                if (i%2 == 1) {
                    counter++;
                }            
            }
            //if the checks are even numbered flip the color one more time so that it starts with the 
            //different color on the next line
            if(width%2 == 0) {
                counter++;
            }
        }

        if(checkerboard.mesh == null) {
            checkerboard.mesh = new THREE.Mesh(checkerboard.geometry, checkerboard.face_material);
            checkerboard.bg_mesh = new THREE.Mesh(checkerboard.bg_geometry,bg_material);
            scene.add(checkerboard.bg_mesh);
            scene.add(checkerboard.mesh);
        } else {
            checkerboard.mesh.geometry = checkerboard.geometry;
            checkerboard.mesh.face_material = checkerboard.face_material;

            checkerboard.bg_mesh.geometry = checkerboard.bg_geometry;
            checkerboard.bg_mesh.face_material = bg_material;
        }
        update_position();
    }
    update_checkerboard();

    laser_objs.push(checkerboard.mesh);
    //update the laser points when the checkerboard changes
    for(var l=0;l<laser_update_callbacks.length;l++) {
        laser_update_callbacks[l]();
    }

    var _ctrl = checkerboards_ctrl.addFolder('Checkerboard '+String(checkerboards.length));

    _ctrl.addColor(checkerboard.config,'white').onChange(function(val){ checkerboard.config.white=val; update_color()});
    _ctrl.addColor(checkerboard.config,'black').onChange(function(val){ checkerboard.config.black=val; update_color()});
    _ctrl.add(checkerboard.config,'scale').onChange(function(val){ checkerboard.config.scale=val; update_checkerboard()});
    _ctrl.add(checkerboard.config,'height').step(1).onChange(function(val){ checkerboard.config.height=val; update_checkerboard()});
    _ctrl.add(checkerboard.config,'width').step(1).onChange(function(val){ checkerboard.config.width=val; update_checkerboard()});
    _ctrl.add(checkerboard.config,'visible').onChange(function(val) { checkerboard.mesh.visible = val;});
    var position = _ctrl.addFolder('Position');
    position.add(checkerboard.config.position,'x').onChange(function(val) { checkerboard.config.position.x=val; update_position();});
    position.add(checkerboard.config.position,'y').onChange(function(val) { checkerboard.config.position.y=val; update_position();});
    position.add(checkerboard.config.position,'z').onChange(function(val) { checkerboard.config.position.z=val; update_position();});

    var rotation = _ctrl.addFolder('Rotation');
    rotation.add(checkerboard.config.rotation,'roll').onChange(function(val) { checkerboard.config.rotation.roll=val; update_checkerboard();});
    rotation.add(checkerboard.config.rotation,'pitch').onChange(function(val) { checkerboard.config.rotation.pitch=val; update_checkerboard();});
    rotation.add(checkerboard.config.rotation,'yaw').onChange(function(val) { checkerboard.config.rotation.yaw=val; update_checkerboard();});

}

function create_robot() {
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    var material = new THREE.MeshPhongMaterial( {color: '#'+(Math.random()*0xFFFFFF<<0).toString(16)} );
    var robo = new THREE.Mesh( geometry, material );
    var pos = [0,0.5,0]; //on the ground and few behind the origin
    var scale = [1,1,2]; //making a cuboid
    robo.position.set(pos[0],pos[1],pos[2]);
    robo.scale.set(scale[0],scale[1],scale[2]);
    scene.add( robo );

    var robot_struct = {
        robot: robo,
        config: {
            position: {x:pos[0], y:pos[1], z:pos[2]},
            size: {x:scale[0], y:scale[1], z:scale[2]},
            type: 'cube',
            camera_pos_diffs: [],  
            visible: false
        },    
    };

    robots.push(robot_struct);

    var update_robot = function() {

        if (!robot_struct.config.visible) {
            robo.visible = false;
        } else {
            robo.visible = true;
        }

        robo.position.set(robot_struct.config.position.x, robot_struct.config.position.y, robot_struct.config.position.z);
        robo.scale.set(robot_struct.config.size.x,robot_struct.config.size.y, robot_struct.config.size.z);

        //Update the camera positions here
        //we will just do a translation here. But ideally it should be a homogeneous transform
        //since we do not have those controls here, it is ok
        for(var i=0;i<cameras.length;i++) {

            var diff = robot_struct.camera_pos_diffs[i];
            cameras[i].position.x = diff[0] + robot_struct.config.position.x;
            cameras[i].position.y = diff[1] + robot_struct.config.position.y;
            cameras[i].position.z = diff[2] + robot_struct.config.position.z;
            cameras[i].update();
        }
    }
    
    update_robot();

    //var roboctrl = robots_ctrl.addFolder('Robot '+String(robots.length));
    var roboctrl = robots_ctrl;
    roboctrl.add(robot_struct.config,'visible',true).onChange(function(val) {robot_struct.visible=val; update_robot()});

    var position = roboctrl.addFolder('Position');
    position.add(robot_struct.config.position,'x').onChange(function(val) { robot_struct.config.position.x=val; update_robot()});
    position.add(robot_struct.config.position,'y').onChange(function(val) { robot_struct.config.position.y=val; update_robot()});;
    position.add(robot_struct.config.position,'z').onChange(function(val) { robot_struct.config.position.z=val; update_robot()});;
    
    var size = roboctrl.addFolder('Size');
    size.add(robot_struct.config.size,'x').onChange(function(val) { robot_struct.config.size.x=val; update_robot()});
    size.add(robot_struct.config.size,'y').onChange(function(val) { robot_struct.config.size.y=val; update_robot()});
    size.add(robot_struct.config.size,'z').onChange(function(val) { robot_struct.config.size.z=val; update_robot()});

}

function rotateScene(deltaX, deltaY) {
    scene.rotation.y += deltaX / 100;
    scene.rotation.x += deltaY / 100;
}

function rotateView(deltaX, deltaY) {
    default_view.rotation.y  += deltaX/100;
    default_view.rotation.x  += deltaY/100;
       
    //view.lookAt.deltaX + deltaX
    //view.lookAt.y += deltaX / 100;
    //view.lookAt.x += deltaY / 100;
}

function zoomScene(zoom_in) {
    default_view.position.z += zoom_in
}

function animate(time) {

    render(time);

    //do any other updates here
    
    //we are creating a chain here (not recursion)
    //everytime after rendering the changes, we set to call the same function again
    //if we dont register this function, then the graphics will be stationary and will not change
    requestAnimationFrame(animate);

}
function render(time) {
    //time *= 0.001;  // convert time to seconds
    width = renderer.domElement.clientWidth;
    height = renderer.domElement.clientHeight;

    controls.update();

    if (expand_default_view) {
        //render default view full screen
        renderer.setViewport(0,0,width,height);
        renderer.setScissor(0,0,width,height);
        renderer.setScissorTest(true);
        //it is ok to modify the aspect for the default view
        default_view.aspect = width/height;
        default_view.updateProjectionMatrix();
        renderer.render(scene, default_view);
    } else {

        //render the cameras to the left for 30% and default view to the right
        var cam_percent = 0.3

        var max_cam_width = cam_percent*width; //width for each camera. we will adjust this further based on aspect ratio
        var cam_height = height/cameras.length;
        var cam_height_counter = height; //start from top
        
        for(var i=0;i<cameras.length;i++) {
            cam_height_counter -= cam_height;

            var x = 0;
            var y = Math.floor(cam_height_counter);
            var w = Math.floor(cameras[i].config.aspect * cam_height); //get the width. This should be less than the max_cam_width
            var h = Math.floor(cam_height);
            if (w > max_cam_width) {
                //cannot accomodate the desired width
                //lets adjust the height accordingly
                w = max_cam_width;
                h = Math.floor(w/cameras[i].config.aspect);

                if (h > cam_height) {
                    alert('Calculated height is larger than camera height??!!! h:',h, ' cam_height:',cam_height);
                }
            }
            //debugger;
            renderer.setViewport(x,y,w,h);
            renderer.setScissor(x,y,w,h);
            renderer.setScissorTest(true);
            //cameras[i].cam_obj.aspect = w/h; //TODO: this is probably wrong - check what happens when the correct aspect is set
            //cameras[i].cam_obj.updateProjectionMatrix(); //TODO: this will be needed only when the aspect is set?
            renderer.render(scene,cameras[i].cam_obj);
            

        } 

        var default_view_height = height; //use the full height
        var default_view_width = Math.floor(width*(1.-cam_percent));
        var default_view_x = Math.floor(width*cam_percent); //start at the end of the camera view
        var default_view_y = 0;
        
        //render the default view in the other half
        renderer.setViewport(default_view_x,default_view_y,default_view_width,default_view_height);
        renderer.setScissor(default_view_x,default_view_y,default_view_width,default_view_height);
        renderer.setScissorTest(true);
        //it is ok to modify the aspect for the default view
        default_view.aspect = default_view_width/default_view_height;
        default_view.updateProjectionMatrix();
        renderer.render(scene,default_view);
    }
}


function onMouseMove(evt) {
    if (!mouseDown) {
        return;
    }

    evt.preventDefault();

    var deltaX = evt.clientX - mouseX,
        deltaY = evt.clientY - mouseY;
    mouseX = evt.clientX;
    mouseY = evt.clientY;
    //rotateScene(deltaX, deltaY);
    //rotateView( deltaX, deltaY);
    //console.log("x:"+String(default_view.position.x)+' y:'+String(default_view.position.y)+' z:'+String(default_view.position.z));
}

function onMouseDown(evt) {
    evt.preventDefault();

    mouseDown = true;
    mouseX = evt.clientX;
    mouseY = evt.clientY;
}

function onMouseUp(evt) {
    evt.preventDefault();

    mouseDown = false;
}

function onMouseWheel(evt) {
    evt.preventDefault();

    //zoomScene(evt.deltaY*0.1);
}

function addMouseHandler(obj) {
    obj.addEventListener('mousemove', function (e) {
        onMouseMove(e);
    }, false);
    obj.addEventListener('mousedown', function (e) {
        onMouseDown(e);
    }, false);
    obj.addEventListener('mouseup', function (e) {
        onMouseUp(e);
    }, false);
    obj.addEventListener('wheel', function (e) {
        onMouseWheel(e);
    }, false);
}

function saveAs(blob, filename) {
    if (typeof navigator.msSaveOrOpenBlob !== 'undefined') {
      return navigator.msSaveOrOpenBlob(blob, fileName);
    } else if (typeof navigator.msSaveBlob !== 'undefined') {
      return navigator.msSaveBlob(blob, fileName);
    } else {
      var elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;
      elem.style = 'display:none;opacity:0;color:transparent;';
      (document.body || document.documentElement).appendChild(elem);
      if (typeof elem.click === 'function') {
        elem.click();
      } else {
        elem.target = '_blank';
        elem.dispatchEvent(new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        }));
      }
      URL.revokeObjectURL(elem.href);
    }
}

function onButtonClick(event) {
    if(event.target.id == 'add_object') {
        add_object(get_default_object());
    
    } else if(event.target.id == 'add_camera') {
        cam_pos_incre += 0.5;
        create_camera_views(get_default_camera());

    } else if(event.target.id == 'add_laser') {
    
        add_laser(get_default_laser());

    } else if(event.target.id == 'add_checkerboard') {
    
        add_checkerboard();

    } else if(event.target.id == 'expand_view') {
        toggle_view();

    } else if(event.target.id == 'config_loader') {
        load_config();

    } else if(event.target.id == 'snapshot_scene') {
        snapshot_scene();
    }
}

function toggle_view() {
    expand_default_view = !expand_default_view;
}

function load_config() {
    var config_loader = document.getElementById("config_loader");

    if (show_config_loader == true) {
        document.getElementById('file_selector_div').style.display = "block";
        show_config_loader = false;
    }
    else {
        document.getElementById('file_selector_div').style.display = "none";
        show_config_loader = true;

    }
}

function snapshot_scene() {
           
    var zip = new JSZip();
    var img = zip.folder('images');

    for(var i=0;i<cameras.length;i++) {

        var width = cameras[i].config.width_in_pixels;
        var height = Math.round(width/cameras[i].config.aspect);

        //var view_renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        //setpixelratio  sets the pixel multiplier ie, if we the number of pixels is 1024 and if 
        //we set the pixel ratio to 2 (default on my mac), then the downloaded image is twice that size (2048)
        camera_frame_renderers[i].setPixelRatio(1); 
        camera_frame_renderers[i].setSize( width, height);

        //this block of code downloads the view to a file
        var a = document.createElement('a');
        // Without 'preserveDrawingBuffer' set to true, we must render now
        camera_frame_renderers[i].setViewport(0,0,width,height);
        camera_frame_renderers[i].setScissor(0,0,width,height);
        camera_frame_renderers[i].setScissorTest(true);
        camera_frame_renderers[i].render(scene, cameras[i].cam_obj);
        
        //uncomment this block if you want to download the images separately
        //a.href = camera_frame_renderers[i].domElement.toDataURL().replace("image/png", "image/octet-stream");
        //a.download = 'camera'+String(i+1)+'.png'
        //a.click();

        //this block adds the camera files to a zip file
        //extract the canvas to a uri with base64 encoding to write to a file 
        uri = camera_frame_renderers[i].domElement.toDataURL();
        //the uri starts with "data:image/png;base64,iVBOR...."
        //however JSZip expects only the string not the preamble. So get rid of that
        img.file('camera'+String(i+1)+'.png',uri.substring(22),{base64:true,createFolders: true });

    }
    
    //write the config
    var config = zip.folder('config'); 

    if(cameras.length > 0){ 
        var camera_config = [];
        for (var i=0;i<cameras.length;i++) {
            camera_config.push(cameras[i].config);
        }
        config.file('cameras.json',JSON.stringify(camera_config));
    }

    if(objects.length > 0) {
        var obj_config = [];
        for (var i=0;i<objects.length;i++){
            obj_config.push(objects[i].config);
        }
        config.file('objects.json',JSON.stringify(obj_config));
    }
    
    if(lasers.length > 0) {

        // write the laser points
        var pts = zip.folder('points');

        var laser_config = [];
        for (var i=0;i<lasers.length;i++){
            laser_config.push(lasers[i].config);
            pts.file('laser_'+lasers[i].config.id+'.csv',lasers[i].points);
        }
        config.file('lasers.json',JSON.stringify(laser_config));    
    }
    
    if(checkerboards.length > 0) {
        var checker_config = [];
        for (var i=0;i<checkerboards.length;i++){
            laser_config.push(checkerboards[i].config);
        }
        config.file('checkerboards.json',JSON.stringify(checker_config));    
    }

    if(robots.length > 0) {
        var robot_config = [];
        for (var i=0;i<robots.length;i++){
            robot_config.push(robots[i].config);
        }
        config.file('robots.json',JSON.stringify(robot_config));    
    }



    zip.generateAsync({type:"blob"}).then(function(content) {
        var a = new Date();
        var year = a.getFullYear().toString().padStart(4,0);
        var month = a.getMonth().toString().padStart(2,0);
        var date = a.getDate().toString().padStart(2,0);
        var hour = a.getHours().toString().padStart(2,0);
        var min = a.getMinutes().toString().padStart(2,0);
        var sec = a.getSeconds().toString().padStart(2,0);
        var time = year + '' + month + '' + date + '-' + hour + '_' + min + '_' + sec ;
        
        saveAs(content,'perception_system_'+ time +'.zip');
    });
}


