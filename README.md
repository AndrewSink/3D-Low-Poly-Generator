# 3D Low Poly Generator / Mesh Decimation Tool

Try it out: [3D Low Poly Generator](https://lowpoly3d.xyz/)

Find this project useful? You can buy me a [coffee on Ko-Fi](https://ko-fi.com/andrewsink)!

The 3D Low Poly Generator lets you import an .STL file and create a low poly masterpiece of your own, perfect for 3D printing! The entire process is done in-browser using [three.js](https://threejs.org/), so there's no additional software to load or learn. Just upload a file and start experimenting!

<img width="640" alt="hi1" src="https://user-images.githubusercontent.com/46334898/182034633-92e4ebee-e0a1-4978-a8f4-6004796d1ea6.png">
<img width="640" alt="hi2" src="https://user-images.githubusercontent.com/46334898/182034638-24c66db0-d536-4ec3-bffb-9e5d37788038.png">


## Usage

The 'Triangle Reduction %' slider will adjust the overall amount of decimation. A higher number will result in a higher number of triangles removed.

Example: </br>
Triangle Reduction 30%: 30% of triangles removed </br>
Triangle Reduction 5%: 5% of triangles removed </br>

### Commands

**Decimate:** Updates current mesh with requested triangle reduction </br>
**Reset:** Resets current mesh to original triangle count </br>
**Export STL:** Exports an .stl with the current triangle count </br>
**Export OBJ:** Exports an .obj with the current triangle count </br>

## How it works

The 3D Low Poly Generator uses the Simplifymodifier.js class to reduce a mesh by a set number of triangles.

## Time Estimation

The implementation of a time estimate was my wife's idea (thanks Erica!), and it makes the whole project feel more complete. Because the interface becomes unresponsive during processing and there is no progress bar, the time estimation can be used to know if a mesh *should* be finished after a certain amount of time.

<img width="593" alt="Deci4" src="https://user-images.githubusercontent.com/46334898/143715994-83b3573f-56b7-44c1-b06a-227173771811.png">

I ran the 3D Low Poly Generator using several different models at various levels of triangle reduction, and logged the time and number of triangles reduced. The average I calculated was .00267 seconds per triangle removed.</br>

This variable is used to calculate the overall amount of time required to reduce a mesh by a given number of triangles. </br>

>var currentTri = currentTriangles</br>
>var targetTri = currentTriangles - (Math.floor((decimatePercentage* currentTriangles)))</br>
>var time = Math.floor((decimatePercentage * currentTriangles) * .00267)</br>

It's not 100% accurate, but it is able to give a good indication of the general amount of time required to process a mesh, as well as estimating how many triangles will be removed. 

<img width="640" alt="Triangle_Count" src="https://user-images.githubusercontent.com/46334898/182034572-620d1370-0a94-408a-99e3-04d2ef81acfb.png">

Read more here: https://3dwithus.com/low-poly-generator-reduce-stl-file-size-and-create-art
