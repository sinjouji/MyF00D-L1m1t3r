

if ('serviceWorker' in navigator) {

  window.addEventListener('load', function() {

    navigator.serviceWorker
      .register('./service-worker.js')
      .then(function(reg) {

        console.log(
          'Service Worker registered',
          reg
        );

      })
      .catch(function(err) {

        console.error(
          'Service Worker failed',
          err
        );
      });
  });
}


