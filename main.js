//
//  main.js
//
//  A project template for using arbor.js
//

(function($){

  var Renderer = function(canvas){
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d");
    ctx.font = "30px Arial";
    var particleSystem
    var nextNodeName = "aa"

    var that = {
      init:function(system){
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        particleSystem = system

        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        particleSystem.screenSize(canvas.width, canvas.height) 
        particleSystem.screenPadding(80) // leave an extra 80px of whitespace per side
        
        // set up some event handlers to allow for node-dragging
        that.initMouseHandling()
      },
      
      redraw:function(){
        // 
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        // 
        ctx.fillStyle = "white"
        ctx.fillRect(0,0, canvas.width, canvas.height)
        
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords

          // draw a line from pt1 to pt2
          ctx.strokeStyle = "rgba(0,0,0, .333)"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
          ctx.stroke()
        })

        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords

          // draw a rectangle centered at pt

          var w = 10
          ctx.fillStyle = (node.data.color)
          //ctx.fillRect(pt.x-w/2, pt.y-w/2, w,w)
          ctx.fillText(node.data.text , pt.x, pt.y)
        })    			
      },
      
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;
        var edited = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            target = particleSystem.nearest(_mouseP);
            if (e.which === 1){
              dragged = target
              if (dragged && dragged.node !== null){
                // while we're dragging, don't let physics move the node
                dragged.node.fixed = true
              }

              $(canvas).bind('mousemove', handler.dragged)
              $(window).bind('mouseup', handler.dropped)
            }
            if(e.which === 3){
              //enable editing mode on this node 
              target.node.data.color = "blue"
              e.preventDefault();
              $(canvas).bind('mousedown', handler.doneWithEdit)
              $(window).bind("keydown",handler.edit)
              $(canvas).unbind('mousedown', handler.clicked)
              edited = target;
            }
            if(e.which === 2){
              getNextNodeName = function(){
                oldname = nextNodeName;
                nextNodeName = nextNodeName + "a"
                return oldname;
              }
              nodename = getNextNodeName();
              particleSystem.addNode(nodename ,{text:"new node", color:"black"})
              particleSystem.addEdge(target.node, nodename)
            }


            return false
          },
          edit:function(e){
            if (e.originalEvent.key == "Backspace"){
              edited.node.data.text = edited.node.data.text.substring(0,edited.node.data.text.length-1)
            }
            if (e.originalEvent.key == "Enter"){
              handler.doneWithEdit(e)
            }
            if(e.originalEvent.key.length == 1){
              edited.node.data.text = edited.node.data.text+e.originalEvent.key
            }
          },
          doneWithEdit:function(e){
            $(window).unbind('keydown', handler.edit)
            $(canvas).unbind('mousedown',handler.doneWithEdit)
            $(canvas).bind('mousedown',handler.clicked)
            edited.node.data.color = "black"
          },
          dragged:function(e){
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (dragged && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            _mouseP = null
            return false
          }
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);
        console.log($(canvas))
      },
      
    }
    return that
  }    

  $(document).ready(function(){
    var sys = arbor.ParticleSystem(1000, 600, 0.5) // create the system with sensible repulsion/stiffness/friction
    sys.parameters({gravity:true}) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...

    // add some nodes to the graph and watch it go...
    sys.addEdge('a','b')
    sys.addEdge('a','c')
    sys.addEdge('a','d')
    sys.addEdge('a','e')
    //sys.addNode('f', {alone:true, mass:.25})

    sys.getNode("a").data = {text:"hello there", color:"black"}
    sys.getNode("b").data = {text:"hello there", color:"black"}
    sys.getNode("c").data = {text:"hello there", color:"black"}
    sys.getNode("d").data = {text:"hello there", color:"black"}
    sys.getNode("e").data = {text:"hello there", color:"black"}

    // or, equivalently:
    //
    // sys.graft({
    //   nodes:{
    //     f:{alone:true, mass:.25}
    //   }, 
    //   edges:{
    //     a:{ b:{},
    //         c:{},
    //         d:{},
    //         e:{}
    //     }
    //   }
    // })
    
  })

})(this.jQuery)