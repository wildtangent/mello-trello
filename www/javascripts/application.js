(function(){

  var data = {};
  var boardId = getParameterByName('boardId');

  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)")
    var results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  // Authorize Trello Account
  function authorizeTrello(){
    Trello.authorize({
      type: 'popup',
      name: 'Mello Trello',
      scope: {
        read: true,
        write: false 
      },
      expiration: 'never',
      success: function(){
        console.log("Successful authentication");
        fetchData();
      },
      error: function(){
        console.log("Failed authentication"); 
      }
    });
  }

  // Fetch Data from Trello
  function fetchData(){
    Trello.get('boards/' + boardId, function(board){
      var boardData = board;
      Trello.get('boards/' + boardId + '/lists', function(lists){
        boardData.lists = lists;
        Trello.get('boards/' + boardId + '/cards', function(cards){
          boardData.cards = cards;
          showData(eatData(boardData));
        })
      });

    })
    
  };
      
  // Munge data ready for use in template
  function eatData(trelloJson){
    var data = {
      board: trelloJson.name,
      lists: [],
      ref: {}
    }

    for(i in trelloJson.lists){
      var list = trelloJson.lists[i]
      if(list.closed){
        //continue
      }
      data.ref[list.id] = {
        name: list.name,
        cards: []
      }
      data.lists.push(data.ref[list.id])
    }

    for(i in trelloJson.cards){
      var card = trelloJson.cards[i]
      if(card.closed){
        //continue
      }
      
      // Grab estimated and actual times from card name
      var estimateTime = card.name.match(/^\(([0-9\.\?]+)\)/);
      var actualTime = card.name.match(/\[([0-9.]+)\]$/);

      if(estimateTime !== null){
        if(estimateTime[1] == "?"){
          card.estimateTime = "Not yet estimated";
        } else{
          card.estimateTime = estimateTime[1] + " hours";
        }
      }
      data.ref[card.id] = {
        name: card.name,
        estimateTime: card.estimateTime,
        actualTime: card.actualTime,
        desc: marked(card.desc),
        actions: []
      }
      
      data.ref[card.idList].cards.push(data.ref[card.id])    
    }

    for(i in trelloJson.actions){
      var action = trelloJson.actions[i]
      if(action.type != "commentCard"){
        continue
      }
         
      data.ref[action.id] = {
        text: marked(action.data.text),
        date: moment(action.date).format('YYYY-MM-DD')
      }
      
      try{
        data.ref[action.data.card.id].actions.push(data.ref[action.id])
      } catch(e) {
        // Nothing!
      }
    }

    return data;
  }

  // Convert data into Mustache template
  function showData(data){
    var template = $('#template-output').html()
    console.log(JSON.stringify(data,null,2))
    $('#out').html(Mustache.render(template, data))
  }

  // Run the code
  function autorun() {
    authorizeTrello();
  }


  // Run on DOM reay
  $(function(){
    autorun();
  });

})($)
