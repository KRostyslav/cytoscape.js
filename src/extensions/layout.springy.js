;(function($$){ 'use strict';
  
  var defaults = {
    animate: true, // whether to show the layout as it's running
    maxSimulationTime: 3000,
    ungrabifyWhileSimulating: true,
    stiffness: 400,
    repulsion: 400,
    damping: 0.5,
    fit: true,
    padding: 30,
    random: false
  };
  
  function SpringyLayout( options ){
    this.options = $$.util.extend(true, {}, defaults, options);
  }
  
  SpringyLayout.prototype.run = function(){
    var layout = this;
    var self = this;
    var options = this.options;

    var cy = options.cy;
    cy.trigger({ type: 'layoutstart', layout: layout });
    
    var nodes = cy.nodes().not(':parent');
    var edges = cy.edges();
 
    var width = cy.width();
    var height = cy.height();
    
    // make a new graph
    var graph = new Springy.Graph();

    // make some nodes
    nodes.each(function(i, node){
      node.scratch('springy', {
        model: graph.newNode({
          element: node
        })
      });
    });

    // connect them with edges
    edges.each(function(i, edge){
      var fdSrc = edge.source().scratch('springy').model;
      var fdTgt = edge.target().scratch('springy').model;
      
      edge.scratch('springy', {
        model: graph.newEdge(fdSrc, fdTgt, {
          element: edge
        })
      });
    });
    
    var layout = new Springy.Layout.ForceDirected(graph, options.stiffness, options.repulsion, options.damping);
    
    var currentBB = layout.getBoundingBox();
    // var targetBB = {bottomleft: new Springy.Vector(-2, -2), topright: new Springy.Vector(2, 2)};
    
    // convert to/from screen coordinates
    var toScreen = function(p) {
      var size = currentBB.topright.subtract(currentBB.bottomleft);
      var sx = p.subtract(currentBB.bottomleft).divide(size.x).x * width;
      var sy = p.subtract(currentBB.bottomleft).divide(size.y).y * height;
      return new Springy.Vector(sx, sy);
    };

    var fromScreen = function(s) {
      var size = currentBB.topright.subtract(currentBB.bottomleft);
      var px = (s.x / width) * size.x + currentBB.bottomleft.x;
      var py = (s.y / height) * size.y + currentBB.bottomleft.y;
      return new Springy.Vector(px, py);
    };
    
    var movedNodes = cy.collection();
    
    var numNodes = cy.nodes().size();
    var drawnNodes = 1;
    var fdRenderer = new Springy.Renderer(layout,
      function clear() {
        if( movedNodes.length > 0 && options.animate ){
          movedNodes.rtrigger('position');

          if( options.fit ){
            cy.fit( options.padding );
          }

          movedNodes = cy.collection();
        }
      },

      function drawEdge(edge, p1, p2) {
        // draw an edge
      },

      function drawNode(node, p) {
        var v = toScreen(p);
        var element = node.data.element;
        
        window.p = p;
        window.n = node;
        
        if( !element.locked() && !element.grabbed() ){
            element._private.position = {
              x: v.x,
              y: v.y
            };
            movedNodes.merge(element);
        } else {
          //setLayoutPositionForElement(element);
        }
        
        if( drawnNodes == numNodes ){
          cy.one('layoutready', options.ready);
          cy.trigger({ type: 'layoutready', layout: layout });
        } 
        
        drawnNodes++;
      
      }
    );
    
    // set initial node points
    nodes.each(function(i, ele){
      if( !options.random ){
        setLayoutPositionForElement(ele);
      }
    });
    
    // update node positions when dragging
    nodes.bind('drag', function(){
      setLayoutPositionForElement(this);
    });
    
    function setLayoutPositionForElement(element){
      var fdId = element.scratch('springy').model.id;
      var fdP = fdRenderer.layout.nodePoints[fdId].p;
      var pos = element.position();
      var positionInFd = (pos.x != null && pos.y != null) ? fromScreen(element.position()) : {
        x: Math.random() * 4 - 2,
        y: Math.random() * 4 - 2
      };
      
      fdP.x = positionInFd.x;
      fdP.y = positionInFd.y;
    }
    
    var grabbableNodes = nodes.filter(":grabbable");
    
    function start(){
      // disable grabbing if so set
      if( options.ungrabifyWhileSimulating ){
        grabbableNodes.ungrabify();
      }
      
      fdRenderer.start();
    }
    
    var stopSystem = self.stopSystem = function(){ console.log('stop');
      graph.filterNodes(function(){
        return false; // remove all nodes
      });
      
      if( options.ungrabifyWhileSimulating ){
        grabbableNodes.grabify();
      }

      if( options.fit ){
        cy.fit( options.padding );
      }
      
      cy.one('layoutstop', options.stop);
      cy.trigger({ type: 'layoutstop', layout: layout });

      self.stopSystem = null;
    };
    
    start();
    setTimeout(function(){
      self.stop();
    }, options.maxSimulationTime);

  };

  SpringyLayout.prototype.stop = function(){
    if( this.stopSystem != null ){
      this.stopSystem();
    }
  };
  
  $$('layout', 'springy', SpringyLayout);

  
})(cytoscape);
