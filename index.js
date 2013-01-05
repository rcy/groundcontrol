var elevator;
var directionsDisplay;
var directionsService;
var map;
var pointsInPath = 512;

function initialize() {
  // initialize map
  elevator = new google.maps.ElevationService();
  directionsService = new google.maps.DirectionsService();

  var mapOptions = {
    center: new google.maps.LatLng(-34.397, 150.644),
    zoom: 9,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  directionsDisplay = new google.maps.DirectionsRenderer();
  map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
  directionsDisplay.setMap(map);

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

    // draw a marker on the map at this location
    var marker = new google.maps.Marker({ position: ll, map: map });

    // show my elevation
    var request = { locations: [ll] };
    elevator.getElevationForLocations(request, function(result, status) {
      console.log('getel: ', status, result);
      $("#location .elevation").text(Math.floor(result[0].elevation));
    });

  });

}

function placeMarker(latLng) {
  console.log('place marker', latLng);
  var marker = new google.maps.Marker({ position: latLng, map: map });
}

function registerEvents() {
  // google.maps.event.addListener(map, 'click', function(event) {
  //   placeMarker(event.latLng);
  // });

  $('form.directions').on('submit', function(e) {
    e.preventDefault();

    $form = $(e.currentTarget);

    console.log('submitted directions form', $form.serialize());

    var origin = $form.find('input[name=origin]').val();
    var destination = $form.find('input[name=destination]').val();

    var request = {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      region: 'CA'
    };

    directionsService.route(request, function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        directionsDisplay.setDirections(result);
        console.log('directions result',result);

        // get elevation for direction path
        var meters = result.routes[0].legs[0].distance.value;
        var path = result.routes[0].overview_path;
        var samples = Math.min(512, parseInt(meters / 500));

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
            data.addRow([Math.round(i * xStep * 10)/10, Math.round(this.elevation*10)/10]);
          });

          var chart = new google.visualization.AreaChart($elevation_div[0]);
          var options = {
            title: "Elevation profile",
          };
          chart.draw(data, options);

        });

      } else {
        console.log('status: ', status);
      }
    });
  });
}
