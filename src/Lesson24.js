/**
 * Lesson24-混合的学习，透明-半透明的物体
 * @Author: lzmxqh 
 * @Date: 2021-04-14 23:41:46 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-04-18 23:28:39
 */
/**顶点着色器 */ 
var vs = `
    attribute vec3 position;
    attribute vec4 color;
    attribute vec2 textureCoord;
    uniform mat4 mvpMatrix;
    uniform float vertexAlpha;
    varying vec4 vColor;
    varying vec2 vTextureCoord;
    
    void main() {
        vColor = vec4(color.rgb, color.a * vertexAlpha);
        vTextureCoord = textureCoord;
        gl_Position = mvpMatrix * vec4(position, 1.0);
    }
`;

/**片段着色器 */ 
var fs = `
    precision mediump float;
    
    uniform sampler2D texture;
    uniform int useTexture;
    varying vec4 vColor;
    varying vec2 vTextureCoord;

    void main() {
        vec4 destColor = vec4(0.0);
        if (bool(useTexture)) {
            vec4 smpColor = texture2D(texture, vTextureCoord);
            destColor = vColor * smpColor;
        } else {
            destColor = vColor;
        }
        gl_FragColor = destColor;
    }
`;

var mat4 = glMatrix.mat4;
var webgl = null;
var vertexShaderObject = null;
var fragmentShaderObject = null;
var programObject = null;

var attLocation = new Array();
var uniLocation = new Array();

var count = 0;
var canvas = null;

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
    attLocation[1] = webgl.getAttribLocation(programObject, 'color');
    attLocation[2] = webgl.getAttribLocation(programObject, 'textureCoord');
    
    uniLocation[0]= webgl.getUniformLocation(programObject, 'mvpMatrix');
    uniLocation[1] = webgl.getUniformLocation(programObject, 'vertexAlpha');
    uniLocation[2] = webgl.getUniformLocation(programObject, 'texture');
    uniLocation[3] = webgl.getUniformLocation(programObject, 'useTexture');

    webgl.enable(webgl.DEPTH_TEST);
    webgl.depthFunc(webgl.LEQUAL);

    var position = [
        -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0
    ];

    var color = [
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0
    ];
    
    var textureCoord = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0
    ];

    var index = [
        0, 1, 2,
        3, 2, 1
    ];

    // chrome软件目标路径加上 --allow-file-access-from-files
    textureHandle = initTexture("./res/1.jpg");
    // textureHandle1 = initTexture("./res/2.png");

    // 创建顶点缓冲区
    var vPosition = create_vbo(position);
    var vColor = create_vbo(color);
    var vTextureCoord = create_vbo(textureCoord);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, vPosition);
    webgl.enableVertexAttribArray(attLocation[0]);
    webgl.vertexAttribPointer(attLocation[0], 3, webgl.FLOAT, false, 0, 0);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, vColor);
    webgl.enableVertexAttribArray(attLocation[1]);
    webgl.vertexAttribPointer(attLocation[1], 4, webgl.FLOAT, false, 0, 0);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, vTextureCoord);
    webgl.enableVertexAttribArray(attLocation[2]);
    webgl.vertexAttribPointer(attLocation[2], 2, webgl.FLOAT, false, 0, 0);

    var iIndex = create_ibo(index);
    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, iIndex);
}

function initTexture(imageFile) {
    // 创建一个纹理 webgl
    var texture = webgl.createTexture();
    // 创建一个图片
    texture.image = new Image();
    // 指定图片的路径
    texture.image.src = imageFile;
    texture.image.onload = function() {
        handleLoadedTexture(texture);
    }
    return texture;
}

function handleLoadedTexture(texture) {
    webgl.bindTexture(webgl.TEXTURE_2D, texture);
    
    webgl.texImage2D(webgl.TEXTURE_2D, 0, webgl.RGBA, webgl.RGBA, webgl.UNSIGNED_BYTE, texture.image);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.MIRRORED_REPEAT);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.MIRRORED_REPEAT);

    webgl.bindTexture(webgl.TEXTURE_2D, null);
}

function onStart() {
    // 初始化
    init();

    webgl.blendFunc(webgl.SRC_ALPHA, webgl.ONE);
    webgl.enable(webgl.BLEND);
    webgl.disable(webgl.DEPTH_TEST);

    // 进入游戏循环
    onTick();
}

function degToRad(degree) {
    return degree * Math.PI / 180;
}

function onRender() {
    // 设置重绘背景的颜色
    webgl.clearColor(0.0, 0.0, 0.0, 1.0);
    webgl.clearDepth(1.0);

    // 执行绘制，即将背景清空成指定的颜色(clearColor)
    webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);
    webgl.enable(webgl.DEPTH_TEST);

    var mMatrix =  mat4.identity(mat4.create());
    var vMatrix =  mat4.identity(mat4.create());
    var pMatrix =  mat4.identity(mat4.create());
    var tmpMatrix =  mat4.identity(mat4.create());
    var mvpMatrix =  mat4.identity(mat4.create());

    count++;
    var rad = (count % 360) * Math.PI / 180;

    mat4.lookAt(vMatrix, [0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0]);
    mat4.perspective(pMatrix, 45, canvas.clientWidth / canvas.clientHeight, 0.1, 100.0);

    mat4.multiply(tmpMatrix, pMatrix, vMatrix);

    mat4.identity(mMatrix);
    mat4.translate(mMatrix, mMatrix, [0.25, 0.25, -0.25]);
    mat4.rotate(mMatrix, mMatrix, rad, [0, 1, 0]);
    mat4.multiply(mvpMatrix, tmpMatrix, mMatrix);
    
    webgl.activeTexture(webgl.TEXTURE0);
    webgl.bindTexture(webgl.TEXTURE_2D, textureHandle);

    webgl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    webgl.uniform1f(uniLocation[1], 1.0);
    webgl.uniform1i(uniLocation[2], 0);
    webgl.uniform1i(uniLocation[3], true);
    webgl.drawElements(webgl.TRIANGLES, 6, webgl.UNSIGNED_SHORT, 0);

    mat4.identity(mMatrix);
    mat4.translate(mMatrix, mMatrix, [-0.25, -0.25, 0.25]);
    mat4.rotate(mMatrix, mMatrix, rad, [0, 0, 1]);
    mat4.multiply(mvpMatrix, tmpMatrix, mMatrix);

    webgl.bindTexture(webgl.TEXTURE_2D, null);
    webgl.enable(webgl.BLEND);

    webgl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    webgl.uniform1f(uniLocation[1], 0.5);
    webgl.uniform1i(uniLocation[2], 0);
    webgl.uniform1i(uniLocation[3], false);
    webgl.drawElements(webgl.TRIANGLES, 6, webgl.UNSIGNED_SHORT, 0);
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