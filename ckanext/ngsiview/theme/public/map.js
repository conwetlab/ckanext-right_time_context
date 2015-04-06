function launch_map(pos_list){
    var iconStyle = new ol.style.Style({
        image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
            anchor: [0.5, 46],
            anchorXUnits: 'fraction',
            anchorYUnits: 'pixels',
            opacity: 0.75,
            src: '/images/marker-icon.png'
        }))
    });

    var z;
    var feats = new Array();
    for(z=0;z<pos_list.length;z++){
        var iconFeature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.transform(pos_list[z].pos, 'EPSG:4326', 'EPSG:3857')),
            name: pos_list[z].name,
            attrib: pos_list[z].attrib,
        });
        iconFeature.setStyle(iconStyle);
        feats[feats.length] = iconFeature;
    }

    var vectorSource = new ol.source.Vector({features: feats});
    var vectorLayer = new ol.layer.Vector({source: vectorSource});

    var view = new ol.View({
        center:ol.proj.transform([4.3753899,50.854975], 'EPSG:4326', 'EPSG:3857'),
        zoom: 3,
        minZoom:2,
    });
    var clusterSource = new ol.source.Cluster({
      distance: 20,
      source: vectorSource,
      animationMethod: ol.easing.easeOut,
      animationDuration: 10
    });

    var styleCache = {};
    var clusters = new ol.layer.Vector({
        source: clusterSource,
        style: function(feature, resolution){
        var size = feature.get('features').length;
        var style = styleCache[size];
        if (!style) {
            if(size>1){
                if(size>30){
                    style = [new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 20,
                            stroke: new ol.style.Stroke({
                                color: 'rgba(241, 128, 23, 0.3)',
                                width: 5,
                            }),
                            fill: new ol.style.Fill({
                                color: 'rgba(241, 128, 23, 0.8)'
                            })
                        }),
                        text: new ol.style.Text({
                            text: size.toString(),
                            fill: new ol.style.Fill({
                                color: '#000'
                            })
                        })
                    })];
                    styleCache[size] = style;
                }

                else if(size>10){
                    style = [new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 15,
                            stroke: new ol.style.Stroke({
                                color: 'rgba(110, 204, 57, 0.3)',
                                width: 4,
                            }),
                            fill: new ol.style.Fill({
                                color: 'rgba(110, 204, 57, 0.8)'
                            })
                        }),
                        text: new ol.style.Text({
                            text: size.toString(),
                            fill: new ol.style.Fill({
                                color: '#000'
                            })
                        })
                    })];
                    styleCache[size] = style;
                }
                else{
                    style = [new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 10,
                            stroke: new ol.style.Stroke({
                            color: 'rgba(241, 211, 87, 0.3)',
                            width: 3,
                            }),
                            fill: new ol.style.Fill({
                            color: 'rgba(241, 211, 87, 0.8)'
                            })
                        }),
                        text: new ol.style.Text({
                            text: size.toString(),
                            fill: new ol.style.Fill({
                                color: '#000'
                            })
                        })
                    })];
                    styleCache[size] = style;
                }
            }
            else{
                style = [new ol.style.Style({
                    image: new ol.style.Icon({
                        anchor: [0.5, 46],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'pixels',
                        opacity: 0.75,
                        src: '/images/marker-icon.png'
                    })
                })];
            }
        }
        return style;
        }
    });

    var map = new ol.Map({
        view: view,
        layers: [
            new ol.layer.Tile({source: new ol.source.MapQuest({layer: 'osm'})}),
            clusters
        ],
        target: 'map'}
    );

    var element = document.getElementById('popup');
    var popup = new ol.Overlay({
        element: element,
            positioning: 'bottom-center',
            stopEvent: false
    });
    map.addOverlay(popup);

    var feature;
    // display popup on click
    map.on('click', function(evt) {
        feature = map.forEachFeatureAtPixel(evt.pixel,
        function(feature, layer){return feature;});

        var pan = ol.animation.pan({
              duration: 1500,
              source: /** @type {ol.Coordinate} */ (view.getCenter())
        });
        var zoom = ol.animation.zoom({
                   duration: 2000,
                   resolution: map.getView().getResolution()
        });

        if (feature){
            if(feature.get('features').length==1){
                $(element).popover('destroy');
                $(element).popover({
                    'title':'<center><strong>'+feature.get('features')[0].get('name')+'</strong></center>',
                    'delay': { show: 500, hide: 50 },
                    'html': true,
                    'content': feature.get('features')[0].get('attrib'),
                });
                var geometry = feature.getGeometry();
                var coord = geometry.getCoordinates();
                popup.setPosition(coord);
                $(element).popover('show');
                map.beforeRender(pan);
                view.setCenter(coord);
            }
            else{
                map.beforeRender(pan);
                var geometry = feature.getGeometry();
                var coord = geometry.getCoordinates();
                view.setCenter(coord);
                map.beforeRender(zoom);
                map.getView().setResolution(map.getView().getResolution()/4);
            }
        }
            else {$(element).popover('destroy');}
    });

    var maxlat = Math.max.apply(null, listlat);
    var minlat = Math.min.apply(null, listlat);
    var maxlon = Math.max.apply(null, listlon);
    var minlon = Math.min.apply(null, listlon);

    //centerzoom
    centerlat = (maxlat + minlat)/2;
    centerlon = (maxlon + minlon)/2;
    var autofocus = ol.proj.transform([centerlon, centerlat], 'EPSG:4326', 'EPSG:3857');

    dist = [];
    for(i=0;i<listlat.length;i++){
        distlat = listlat[i]-centerlat;
        distlon = listlon[i]-centerlon;
        dist[dist.length]=2*Math.sqrt(distlat*distlat+distlon*distlon);
    }

    zoomlist = [14,13,12,11,10,9,8,7,6,5,4,3];
    level = Math.ceil((10*Math.max.apply(null, dist))*1,2);
    if(level>11){level = 11;}
    autozoom = zoomlist[level];

    function mapZoom(autofocus,autozoom){
        var pan = ol.animation.pan({
            duration: 2000,
            source: /** @type {ol.Coordinate} */ (view.getCenter())
        });
        map.beforeRender(pan);
        view.setCenter(autofocus);

        var zoom = ol.animation.zoom({
            duration: 2000,
            resolution: map.getView().getResolution()
        });
        map.beforeRender(zoom);
        map.getView().setZoom(autozoom);
    }
    setTimeout(mapZoom(), 2000);

    // change mouse cursor when over marker
    map.on('pointermove', function(e) {
        if (e.dragging) {
            $(element).popover('destroy');
            return;
        }
        var pixel = map.getEventPixel(e.originalEvent);
        var hit = map.hasFeatureAtPixel(pixel);
        map.getTarget().style.cursor = hit ? 'pointer' : '';
    });
}