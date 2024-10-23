
function rotate_x(deg) {
    var mat = lalolib.eye(3);
    var rad = deg * Math.PI/180.0;
    lalolib.set(mat,1,1,cos(rad));
    lalolib.set(mat,1,2,-sin(rad));
    lalolib.set(mat,2,1,sin(rad));
    lalolib.set(mat,2,2,cos(rad));
    return mat;
}

function rotate_y(deg) {
  var mat = lalolib.eye(3);
  var rad = deg * Math.PI/180.0;
  lalolib.set(mat,0, 0, cos(rad));
  lalolib.set(mat,0,2,sin(rad));
  lalolib.set(mat,2,0,-sin(rad));
  lalolib.set(mat,2,2,cos(rad));
  return mat;
}

function rotate_z(deg) {
  var mat = lalolib.eye(3);
  var rad = deg * Math.PI/180.0;
  lalolib.set(mat,0,0,cos(rad));
  lalolib.set(mat,0,1,-sin(rad));
  lalolib.set(mat,1,0,sin(rad));
  lalolib.set(mat,1,1,cos(rad));
  return mat;
}

function rotate_xyz(xrot, yrot, zrot) {
  var rot = lalolib.mul(rotate_z(zrot),lalolib.mul(rotate_y(yrot),rotate_x(xrot)));
  return rot;
}

function cross_prod(a, b) {
  var p = [a[1]*b[2]-b[1]*a[2], -(a[0]*b[2]-b[0]*a[2]),a[0]*b[1]-b[0]*a[1]];
  return p;
}

function get_default_camera() {
  camera_config = { 
    horizontal_FOV:default_hfov,
    aspect:default_aspect,
    near:0.1,
    far:1000,
    position:{x:robots[0].config.position.x+cam_pos_incre,
        y:robots[0].config.position.y,z:robots[0].config.position.z},
    direction:{x:cam_pos_incre,y:0,z:-5},
    width_in_pixels:1024,
    rotation: {verge:0, tilt:0},
    id: cameras.length,
    visible: true,
  }
  return camera_config;
}

function get_default_object() {

  var randsx = Math.random()*2.;
  var randsy = Math.random();
  var randsz = Math.random()*2.;

  var randx = Math.floor(Math.random() * 3);
  var randy = randsy/2.;//Math.floor(Math.random() * 6);
  var randz = - Math.floor(Math.random() * 10);
  var color = '#'+(Math.random()*0xFFFFFF<<0).toString(16);

  object_config = {
    name: "custom_object",
    position: {x:randx, y:randy, z:randz},
    size: {x:randsx, y:randsy, z:randsz},
    type: 'cube',   
    visible: true,
    color: color
  };
  return object_config;
}

function get_default_laser() {

  laser_config = {
    position: {x:0, y:1, z:0},
    rotation: {roll:0, pitch:0, yaw:0},
    orient_type: 'vertical',
    field_of_view: 120,
    num_rays: 20,
    point_size: 3,
    show_rays: true,
    id: 0,
    normal:null,
  };

  return laser_config;
}