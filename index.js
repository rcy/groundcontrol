var elevator;
var directionsDisplay;
var directionsService;
var map;

// minimum sample length for elevations.  Less than 100 meters results
// in a "staircase" effect.
var sampleLengthMeters = 100

function initialize() {
  // initialize map
  elevator = new google.maps.ElevationService();
  directionsService = new google.maps.DirectionsService();

  var mapOptions = {
    center: new google.maps.LatLng(-34.397, 150.644),
    zoom: 9,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    streetViewControl: true,
    rotateControl: true, // not working?
    scaleControl: true,
    overviewMapControl: true,
    panControl: true
  };
  map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

  var rendererOptions = {map:map, draggable:true};
  directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);

  $('form button').removeAttr('disabled');

  // var bikeLayer = new google.maps.BicyclingLayer();
  // bikeLayer.setMap(map);

  registerEvents();

  console.log('current position...');
  navigator.geolocation.getCurrentPosition(function(r) {
    console.log('current position...', r.coords.latitude, r.coords.longitude);

    // center map at this location
    var ll = new google.maps.LatLng(r.coords.latitude,r.coords.longitude);
    map.panTo(ll);

    // display current location on sidebar
    $("#location .lat").text(r.coords.latitude);
    $("#location .lng").text(r.coords.longitude);

  });

}

var markersArray = [];
function placeMarker(latLng) {
  console.log('place marker', latLng);
  clearMarkers();
  var marker = new google.maps.Marker({ position: latLng, map: map });
  markersArray.push(marker);
  map.panTo(latLng);
}
function clearMarkers() {
  $.each(markersArray, function(m) {
    this.setMap(null);
  });
  markersArray = [];
};

var elevationPositionMarker;
function showElevationPositionMarker(latLng) {
  if (!elevationPositionMarker)
    elevationPositionMarker = new google.maps.Marker({
      position: latLng,
      map: map
    });
  else
    elevationPositionMarker.setPosition(latLng);
  elevationPositionMarker.setVisible(true);
}
function hideElevationPositionMarker() {
  if (elevationPositionMarker)
    elevationPositionMarker.setVisible(false);
}

function registerEvents() {
  $('form.directions').on('submit', function(e) {
    clearMarkers();
    e.preventDefault();

    $form = $(e.currentTarget);

    console.log('submitted directions form', $form.serialize());

    var origin = $form.find('input[name=origin]').val();
    var destination = $form.find('input[name=destination]').val();

    var request = {
      origin: origin,
      destination: destination,
      // travelMode: google.maps.TravelMode.BICYCLING,
      travelMode: google.maps.TravelMode.DRIVING,
      region: 'CA'
    };

    directionsService.route(request, function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        directionsDisplay.setDirections(result);
        console.log('directions result',result);
      } else {
        console.log('status: ', status);
      }
    });

    google.maps.event.addListener(directionsDisplay, 'directions_changed', function() {
      console.log('directions_changed');
      var result = directionsDisplay.directions;

      // get elevation for direction path
      var meters = result.routes[0].legs[0].distance.value;
      var path = result.routes[0].overview_path;
      var samples = Math.min(50, Math.min(512, parseInt(meters / sampleLengthMeters)));

      console.log('samples:',samples);
      var request = {
        path: path,
        samples: samples
      };
      console.log('meters:',meters)

      elevator.getElevationAlongPath(request, function(result, status) {
        console.log('elevation for path: ',status, result);

        var $elevation_div = $("#map_elevation");

        var data = new google.visualization.DataTable();
        data.addColumn('number', 'kilometers');
        data.addColumn('number', 'elevation');

        var xStep = meters / samples / 1000;
        console.log('xStep',xStep);
        $.each(result, function(i) {
          data.addRow([Math.round(i * xStep * 10)/10,
                       Math.round(this.elevation)]);
        });

        var chart = new google.visualization.AreaChart($elevation_div[0]);
        var options = {
          title: "Elevation profile from " + origin + " to " + destination,
          legend: { position: 'none' },
          //          curveType: 'function',
          colors: ['#7F5D2B'],
          theme: 'maximized',
        };
        chart.draw(data, options);
        google.visualization.events.addListener(chart, 'onmouseover', function(obj) {
          var latLng = result[obj.row].location;
          showElevationPositionMarker(latLng);
        });
        google.visualization.events.addListener(chart, 'onmouseout', function(obj) {
          var latLng = result[obj.row].location;
          hideElevationPositionMarker();
        });
        google.visualization.events.addListener(chart, 'select', function(obj) {
          var selection = chart.getSelection();
          if (selection[0]) {
            var latLng = result[selection[0].row].location;
            placeMarker(latLng);
            console.log('chart select', selection);
          } else {
            console.log('no selection');
          }
        });


      });
    });
  });
}
