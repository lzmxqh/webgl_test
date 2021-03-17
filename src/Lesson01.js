/**
 * lesson1-清理画布
 * @Author: lzmxqh 
 * @Date: 2021-03-16 22:55:51 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-03-18 00:54:14
 */
window.onload = function () {
    //获取canvas元素
    var canvas = document.getElementById('canvas');
    //获取绘制二维上下文
    var webgl = canvas.getContext('webgl');
    if (!webgl) {
        console.log("Failed");
        return;
    }
    webgl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    webgl.clearColor(0.0, 0.0, 0.0, 1.0);
    webgl.clear(webgl.COLOR_BUFFER_BIT);
}