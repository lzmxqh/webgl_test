/**
 * Lesson40-光照-真实的三维世界-高光圆环
 * @Author: lzmxqh 
 * @Date: 2021-05-12 23:31:29 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-05-14 02:02:21
 */
/**顶点着色器 */ 
var vs = `
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec4 color;
    uniform mat4 mvpMatrix;
    uniform mat4 invMatrix;
    uniform vec3 lightDirection;
    uniform vec3 eyeDirection;
    uniform vec4 ambientColor;
    varying vec4 vColor;
    void main() {
        vec3 invLight = normalize(invMatrix * vec4(lightDirection, 0.0)).xyz;
        vec3 invEye = normalize(invMatrix * vec4(eyeDirection, 0.0)).xyz;
        vec3 halfLE = normalize(invLight + invEye);
        float diffuse = clamp(dot(normal, invLight), 0.0, 1.0);
        float specular = pow(clamp(dot(normal, halfLE), 0.0, 1.0), 50.0);
        vec4 light = color * vec4(vec3(diffuse), 1.0) + vec4(vec3(specular), 1.0);
        vColor = light + ambientColor;
        gl_Position = mvpMatrix * vec4(position, 1.0);
    }
`;

/**片段着色器 */ 
var fs = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
        gl_FragColor = vColor;
    }
`;

var mat3 = glMatrix.mat3;
var mat4 = glMatrix.mat4;
var webgl = null;
var vertexShaderObject = null;
var fragmentShaderObject = null;
var programObject = null;

var attLocation = new Array();
var uniLocation = new Array();
var count = 0;
var canvas = null;
var index = null;

// VBO生成
function create_vbo(data) {
    var vbo = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, vbo);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(data), webgl.STATIC_DRAW);
    webgl.bindBuffer(webgl.ARRAY_BUFFER, null);
    return vbo;
}

// Index Buffer Object 生成
function create_ibo(data) {
    var ibo = webgl.createBuffer();
    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, ibo);
    webgl.bufferData(webgl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), webgl.STATIC_DRAW);
    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
}

function torus(row, column, irad, orad) {
    var pos = new Array(), nor = new Array(),
    col = new Array(), idx = new Array();

    for (var i = 0; i <= row; i++) {
        var r = Math.PI * 2 / row * i;
        var rr = Math.cos(r);
        var ry = Math.sin(r);
        for (var ii = 0; ii <= column; ii++) {
            var tr = Math.PI * 2 / column * ii;
            var tx = (rr * irad + orad) * Math.cos(tr);
            var ty = ry * irad;
            var tz = (rr * irad + orad) * Math.sin(tr);
            var rx = rr * Math.cos(tr);
            var rz = rr * Math.sin(tr);
            pos.push(tx, ty, tz);
            nor.push(rx, ry, rz);
            var tc = hsva(360 / column * ii, 1, 1, 1);
            col.push(tc[0], tc[1], tc[2], tc[3]);
        }
    }

    for (i = 0; i < row; i++) {
        for (ii = 0; ii < column; ii++) {
            r = (column + 1) * i + ii;
            idx.push(r, r + column + 1, r + 1);
            idx.push(r + column + 1, r + column + 2, r + 1);
        }
    }
    return [pos, nor, col, idx];
}

function hsva(h, s, v, a) {
    if (s > 1 || v > 1 || a > 1) {
        return;
    }
    var th = h % 360; 
    var i = Math.floor(th / 60);
    var f = th / 60 - i;
    var m = v * (1 - s);
    var n = v * (1 - s * f);
    var k = v * (1 - s * (1 - f));
    var color = new Array();
    if (!s > 0 && !s < 0) {
        color.push(v, v, v, a);
    } else{
        var r = new Array(v, n, m, m, k, v);
        var g = new Array(k, v, v, n, m, m);
        var b = new Array(m, m, k, v, v, n);
        color.push(r[i], g[i], b[i], a);
    }
    return color;
}

/**初始化，完成资源的加载 */
function init() {
    //获取canvas元素
    canvas = document.getElementById('canvas');
    //获取绘制二维上下文
    webgl = canvas.getContext('webgl');
    webgl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
            
    vertexShaderObject = webgl.createShader(webgl.VERTEX_SHADER);
    fragmentShaderObject = webgl.createShader(webgl.FRAGMENT_SHADER);

    webgl.shaderSource(vertexShaderObject, vs);
    webgl.shaderSource(fragmentShaderObject, fs);

    webgl.compileShader(vertexShaderObject);
    webgl.compileShader(fragmentShaderObject);

    if (!webgl.getShaderParameter(vertexShaderObject, webgl.COMPILE_STATUS)) {
        var err = webgl.getShaderInfoLog(vertexShaderObject);
        alert(err);
        return;
    }
    if (!webgl.getShaderParameter(fragmentShaderObject, webgl.COMPILE_STATUS)) {
        var err = webgl.getShaderInfoLog(fragmentShaderObject);
        alert(err);
        return;
    }
    programObject = webgl.createProgram();
    
    webgl.attachShader(programObject, vertexShaderObject);
    webgl.attachShader(programObject, fragmentShaderObject);

    webgl.linkProgram(programObject);
    if (!webgl.getProgramParameter(programObject, webgl.LINK_STATUS)) {
        var err = webgl.getProgramInfoLog(programObject);
        alert(err);
        return;
    }
    webgl.useProgram(programObject);

    attLocation[0] = webgl.getAttribLocation(programObject, 'position');
    attLocation[1] = webgl.getAttribLocation(programObject, 'normal');
    attLocation[2] = webgl.getAttribLocation(programObject, 'color');
    
    uniLocation[0]= webgl.getUniformLocation(programObject, 'mvpMatrix');
    uniLocation[1] = webgl.getUniformLocation(programObject, 'invMatrix');
    uniLocation[2] = webgl.getUniformLocation(programObject, 'lightDirection');
    uniLocation[3] = webgl.getUniformLocation(programObject, 'eyeDirection');
    uniLocation[4] = webgl.getUniformLocation(programObject, 'ambientColor');

    webgl.enable(webgl.DEPTH_TEST);

    var torusData = torus(32, 32, 1.0, 2.0);
    var position = torusData[0];
    var normal = torusData[1];
    var color = torusData[2];
    index = torusData[3];

    // 创建顶点缓冲区
    var vPosition = create_vbo(position);
    var vNormal = create_vbo(normal);
    var vColor = create_vbo(color);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, vPosition);
    webgl.enableVertexAttribArray(attLocation[0]);
    webgl.vertexAttribPointer(attLocation[0], 3, webgl.FLOAT, false, 0, 0);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, vNormal);
    webgl.enableVertexAttribArray(attLocation[1]);
    webgl.vertexAttribPointer(attLocation[1], 3, webgl.FLOAT, false, 0, 0);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, vColor);
    webgl.enableVertexAttribArray(attLocation[2]);
    webgl.vertexAttribPointer(attLocation[2], 4, webgl.FLOAT, false, 0, 0);

    var ibo = create_ibo(index);
    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, ibo);
}

function onStart() {
    // 初始化
    init();
    // 进入游戏循环
    onTick();
}

function onRender() {
    webgl.enable(webgl.DEPTH_TEST);
    webgl.depthFunc(webgl.LEQUAL);
    webgl.enable(webgl.CULL_FACE);

    // 设置重绘背景的颜色
    webgl.clearColor(0.0, 0.0, 0.0, 1.0);
    webgl.clearDepth(1.0);

    // 执行绘制，即将背景清空成指定的颜色(clearColor)
    webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);
    count++;
    var rad = (count % 360) * Math.PI / 180;

    var mMatrix =  mat4.identity(mat4.create());
    var vMatrix =  mat4.identity(mat4.create());
    var pMatrix =  mat4.identity(mat4.create());
    var tmpMatrix =  mat4.identity(mat4.create());
    var mvpMatrix =  mat4.identity(mat4.create());
    var invMatrix = mat4.identity(mat4.create());

    mat4.lookAt(vMatrix, [0.0, 0.0, 20.0], [0, 0, 0], [0, 1, 0]);
    mat4.perspective(pMatrix, 45, canvas.clientWidth / canvas.clientHeight, 0.1, 100.0);
    mat4.multiply(tmpMatrix, pMatrix, vMatrix);

    // 平行光方向
    var lightDirection = [-0.5, 0.5, 0.5];

    // 视点
    var eyeDirection = [0.0, 0.0, 20.0];

    // 环境光颜色
    var ambientColor = [0.1, 0.1, 0.1, 1.0];

    mat4.identity(mMatrix);
    mat4.rotate(mMatrix, mMatrix, rad, [0, 1, 1]);
    mat4.multiply(mvpMatrix, tmpMatrix, mMatrix);

    mat3.normalFromMat4(invMatrix, mMatrix);
    
    webgl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    webgl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
    webgl.uniform3fv(uniLocation[2], lightDirection);
    webgl.uniform3fv(uniLocation[3], eyeDirection);
    webgl.uniform4fv(uniLocation[4], ambientColor);

    webgl.drawElements(webgl.TRIANGLES, index.length, webgl.UNSIGNED_SHORT, 0);
}

function onTick() {
    requestAnimFrame(onTick);
    onRender();
}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback, element) {
            window.setTimeout(callback, 1000 / 60);
        }
})();


window.onload = onStart();