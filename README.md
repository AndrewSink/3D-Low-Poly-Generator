# 3D Low Poly Generator / Mesh Decimation Tool

Try it out: [3D Low Poly Generator](https://andrewsink.github.io/3D-Low-Poly-Generator/)

The 3D Low Poly Generator lets you import an .STL file and create a low poly masterpiece of your own! The entire process is done in-browser, so there's no additional software to load! Just upload a file and start experimenting!
 

![Deci1](https://user-images.githubusercontent.com/46334898/143689199-513fafce-d3df-4085-8aa7-a72e982d9ad7.png)
![Deci2](https://user-images.githubusercontent.com/46334898/143689202-84e027f4-3f22-4360-8087-ced2e5762f79.png)




## Usage

The 'Decimation Percentage' variable will adjust the overall amount of decimation. A higher number will result in a high number of triangles removed.

Example: </br>
Decimation Percentage: .3 = 30% of triangles removed </br>
Decimation Percentage: .05 = 5% of triangles removed </br>

### Commands

**Update:** Updates current mesh with requested triangle reduction </br>
**Reset:** Resets current mesh to original triangle count </br>
**Export:** Exports an .STL with the current triangle count </br>

## How it works

The 3D Low Poly Generator uses the Simplifymodifier.js class to reduce a mesh by a set number of triangles.

## Time Estimation

The implementation of a time estimate was my wife's idea (thanks Erica!), and it makes the whole project feel more complete. Here's how the estimation was created: 

<img width="593" alt="Deci4" src="https://user-images.githubusercontent.com/46334898/143715994-83b3573f-56b7-44c1-b06a-227173771811.png">

I ran the 3D Low Poly Generator using several different models at various levels of triangle reduction, and logged the time and number of triangles reduced. It followed a roughly linear path, so I used the average of these estimations to create a seconds per triangle variable. This variable is used to calculate the overall amount of time required to reduce a mesh by a given number of triangles. </br>

It's not 100% accurate, but it is able to give a good indication of the general amount of time required to process a mesh. 

![Deci5](https://user-images.githubusercontent.com/46334898/143718408-c1d20201-df25-4c02-a5f3-f8c25f260708.png)


Find this project useful? You can buy me a [coffee on Ko-Fi](https://ko-fi.com/andrewsink)!

Made with [three.js](https://threejs.org/)
