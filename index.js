var distance = require('turf-distance');
var point = require('turf-point');
var linestring = require('turf-linestring');
var bearing = require('turf-bearing');
var destination = require('turf-destination')

/**
 * Measures how far a point is down a line in the specified units.
 *
 * @module turf/point-along-line
 *
 * @param {Point} Point to measure to
 * @param {LineString} Line to measure
 * @param {String} [units=miles] can be degrees, radians, miles, or kilometers
 * @return {Number} Length of the LineString
 * @example
 * var line = {
 *   "type": "Feature",
 *   "properties": {},
 *   "geometry": {
 *     "type": "LineString",
 *     "coordinates": [
 *       [
 *         -77.0316696166992,
 *         38.878605901789236
 *       ],
 *       [
 *         -77.02960968017578,
 *         38.88194668656296
 *       ],
 *       [
 *         -77.02033996582031,
 *         38.88408470638821
 *       ],
 *       [
 *         -77.02566146850586,
 *         38.885821800123196
 *       ],
 *       [
 *         -77.02188491821289,
 *         38.88956308852534
 *       ],
 *       [
 *         -77.01982498168944,
 *         38.89236892551996
 *       ]
 *     ]
 *   }
 * };
 * var pt = turf.point([-77.02033996582031, 38.88408470638821]);
 *
 * 
 * var distance = turf.pointAlongLine(pt, line, 'miles');
 * //=distance
 */

module.exports = function (pt, line, units) {
  var coords;
  if(line.type === 'Feature') coords = line.geometry.coordinates;
  else if(line.type === 'LineString') coords = line.geometry.coordinates;
  else throw new Error('input must be a LineString Feature or Geometry');

  var closestPt = point([Infinity, Infinity], {dist: Infinity});
  for(var i = 0; i < coords.length - 1; i++) {
    var start = point(coords[i])
    var stop = point(coords[i+1])
    //start
    start.properties.dist = distance(pt, start, units);
    //stop
    stop.properties.dist = distance(pt, stop, units);
    //perpendicular
    var direction = bearing(start, stop)
    var perpendicularPt = destination(pt, 1000 , direction + 90, 'miles') // 10000 = gross
    var intersect = lineIntersects(
      pt.geometry.coordinates[0],
      pt.geometry.coordinates[1],
      perpendicularPt.geometry.coordinates[0],
      perpendicularPt.geometry.coordinates[1],
      start.geometry.coordinates[0],
      start.geometry.coordinates[1],
      stop.geometry.coordinates[0],
      stop.geometry.coordinates[1]
      );
    if(!intersect) {
      perpendicularPt = destination(pt, 1000 , direction - 90, 'miles') // 10000 = gross
      intersect = lineIntersects(
        pt.geometry.coordinates[0],
        pt.geometry.coordinates[1],
        perpendicularPt.geometry.coordinates[0],
        perpendicularPt.geometry.coordinates[1],
        start.geometry.coordinates[0],
        start.geometry.coordinates[1],
        stop.geometry.coordinates[0],
        stop.geometry.coordinates[1]
        );
    }
    perpendicularPt.properties.dist = Infinity;
    var intersectPt;
    if(intersect) {
      var intersectPt = point(intersect);
      intersectPt.properties.dist = distance(pt, intersectPt, units)
    }
    
    if(start.properties.dist < closestPt.properties.dist) closestPt = start
    if(stop.properties.dist < closestPt.properties.dist) closestPt = stop
    if(intersectPt && intersectPt.properties.dist < closestPt.properties.dist) closestPt = intersectPt
    closestPt.properties.index = i
  }
  
  console.log(closestPt.properties.index)
  var clipLine = linestring([], {});
  for(var i = 0; i < closestPt.properties.index+1; i++) {
    clipLine.geometry.coordinates.push(coords[i]);
  }
  clipLine.geometry.coordinates.push(closestPt.geometry.coordinates);
  clipLine.properties.stroke = '#f00'
  console.log(JSON.stringify(clipLine))

  var travelled = 0;
  for(var i = 0; i < coords.length - 1; i++) {
    travelled += distance(point(coords[i]), point(coords[i+1]), units);
  }
  return travelled;
}

// modified from http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
function lineIntersects(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
  // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
  var denominator, a, b, numerator1, numerator2, result = {
    x: null,
    y: null,
    onLine1: false,
    onLine2: false
  };
  denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
  if (denominator == 0) {
    if(result.x != null && result.y != null) {
      return result;
    } else {
      return false;
    }
  }
  a = line1StartY - line2StartY;
  b = line1StartX - line2StartX;
  numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
  numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
  a = numerator1 / denominator;
  b = numerator2 / denominator;

  // if we cast these lines infinitely in both directions, they intersect here:
  result.x = line1StartX + (a * (line1EndX - line1StartX));
  result.y = line1StartY + (a * (line1EndY - line1StartY));

  // if line1 is a segment and line2 is infinite, they intersect if:
  if (a > 0 && a < 1) {
    result.onLine1 = true;
  }
  // if line2 is a segment and line1 is infinite, they intersect if:
  if (b > 0 && b < 1) {
    result.onLine2 = true;
  }
  // if line1 and line2 are segments, they intersect if both of the above are true
  if(result.onLine1 && result.onLine2){
    return [result.x, result.y];
  }
  else {
    return false;
  }
}