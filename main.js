$(document).ready(function(){
    //localStorage.clear()

    if(localStorage.getItem("competition") == null){
        $('#toggle_upload').text('Upload Competitor File')
        competitionObject = {
            information: {
                id: "",
                status: "",
                name: "",
                date: "",
                venue: "",
                days: 0,
            },
            events: []
        }
    } else {
        competitionObject = JSON.parse(localStorage.getItem("competition"))
        $('#toggle_upload').text('Upload New Competition File')

        loadCompetitionInfo()

        if($('#display_area').length > 0)
            loadEvents("display")
        else if($('#edit_area').length > 0)
            loadEvents("edit")
    }

    /**
     * Handlers
     */

    $("#toggle_upload").click(() => {
        $("#upload_file").toggle("fast")
    })

    $("#userUpload").change(function(e) {
        file = e.target.files[0]
        fileName = e.target.files[0].name
        fileExt = fileName.split('.')[1]

        if(fileExt == 'csv'){
            $('#comp_name_edit').val(fileName.split('.')[0])
            //see if it is a saved file or a wca file
            loadCSVFile(file)
        } else if (fileExt == 'json'){
            loadJSONfile(file)
        } else {
            alert('Unrecognized File.')
        }

        if($("#upload_file").is(':visible')){
            $("#upload_file").toggle("fast")
        }
    });

    $("#save_competition").click(saveCompetitionInfo)
    $("#download_competition_file").click(downloadCompetitionFile)
    
    $("#download_all_events").click(() => {
        competitionObject.events.forEach((eve) => {
            $('#'+eve.name+'_table').tableToCSV(competitionObject.information);
        })
    })

    $(document).delegate("select.change_group","change", (eve) => {
        groupChose = eve.target.value
        currCompetitor = eve.target.attributes.id.value.split('_')[0]
        currEvent = eve.target.attributes.id.value.split('_')[1]

        changeUserGroup(currEvent,currCompetitor,groupChose)

    })

    $(document).delegate("select.change_role","change", (eve) => {
        roleChose = eve.target.value
        currCompetitor = eve.target.attributes.id.value.split('_')[0]
        currEvent = eve.target.attributes.id.value.split('_')[1]

        changeUserRole(currEvent,currCompetitor,roleChose)

    })

    $(document).delegate("button.change_grouping","click", (eve) => {
        currEvent = ""
        currClasses = eve.target.attributes.class.value.split(" ")
        currClasses.forEach((curClass) => {
            if(curClass.split("_")[1] == 'event')
                currEvent = curClass.split("_")[0]
        })

        currGroupingValue = $("#"+currEvent+"_grouping").val()

        changeGrouping(currEvent,currGroupingValue)

        console.log($("#"+currEvent+"_grouping").val())
    })

    $(document).delegate("button.remove_person","click",(eve) => {
        currName = eve.target.attributes.id.value.split('_')[0]
        currEvent = eve.target.attributes.id.value.split('_')[1]

        console.log(currName+" from event => "+ currEvent)

        removePerson(currEvent,currName)

        //prompt users if they are sure they want to delete user
    })

    $(document).delegate("button.new_person","click",(eve) => {
        console.log(eve.target.attributes.id.value)
        currEvent = eve.target.attributes.id.value.split('_')[0]
        currGroup = eve.target.attributes.id.value.split('_')[1]
        currNewName = $("#"+currEvent+"_"+currGroup+"_new_person_name").val()
        currNewRole = $("#"+currEvent+"_"+currGroup+"_new_person_role").val()

        if(currNewName == ''){
            console.log('No Name')
        } else {
            addNewPerson(currEvent,currGroup,currNewName,currNewRole)
        }
    })

    $(document).delegate("button.download_table","click",(eve) => {
        console.log(eve.target.attributes.id.value)
        currEvent = eve.target.attributes.id.value.split('_')[0]
        console.log(typeof $('#'+currEvent+'_table'))
        $('#'+currEvent+'_table').tableToCSV(competitionObject.information);

    })


    /**
     * Functions
     */

    function saveToLocalStorage(){
        localStorage.setItem("competition", JSON.stringify(competitionObject))
    }

    function readFileContent(file) {
        const reader = new FileReader()
        return new Promise((resolve, reject) => {
            reader.onload = event => resolve(event.target.result)
            reader.onerror = error => reject(error)
            reader.readAsText(file)
        })
    }

    function loadCSVFile(rawFile){
        readFileContent(rawFile).then(raw => {
            processCompetition(raw)
            //load competition info here
        }).catch(error => console.log(error))
    }

    function loadJSONfile(rawFile){
        readFileContent(rawFile).then(raw => {
            competitionObject = JSON.parse(raw)
            //load competition info here
            loadCompetitionInfo()

            loadEvents("edit")
        }).catch(error => console.log(error))
    }

    function loadCompetitionInfo(){
        //load the edit page 
        $('#comp_name_edit').val(competitionObject.information.name)
        $('#comp_days_edit').val(Number(competitionObject.information.days))
        $('#comp_date_edit').val(competitionObject.information.date)
        $('#comp_venue_edit').val(competitionObject.information.venue)

        //load the display page
        $('#comp_name_display').text(competitionObject.information.name)
        $('#comp_days_display').text(Number(competitionObject.information.days))
        $('#comp_date_display').text(competitionObject.information.date)
        $('#comp_venue_display').text(competitionObject.information.venue)
        $('.comp_total_display').text(competitionObject.events.length)

    }

    function saveCompetitionInfo(){
        tempCompName = $('#comp_name_edit').val()
        tempCompDays = $('#comp_days_edit').val()
        tempCompDate = $('#comp_date_edit').val()
        tempCompVenue = $('#comp_venue_edit').val()

        competitionObject.information.name = tempCompName
        competitionObject.information.days = tempCompDays
        competitionObject.information.date = tempCompDate
        competitionObject.information.venue = tempCompVenue

        saveToLocalStorage()
        alert('Competition Saved.')

    }
    function downloadCompetitionFile(){
        saveCompetitionInfo()
        competitionObjectString = JSON.stringify(competitionObject)
        downloadContent(competitionObject.information.name+".json",competitionObjectString)

        function downloadContent(name, content) {
            var atag = document.createElement("a");
            var file = new Blob([content], {type: 'text/plain'});
            atag.href = URL.createObjectURL(file);
            atag.download = name;
            atag.click();
        }
    }

    function processCompetition(string){
        dataSplit = string.split('\n')
        colLabels = []
        tempEvents = []
        tempEventsLabels = []
        competitors = []
        events = []

        dataSplit.forEach((line,lineIndex) => {
            //get the labels of each column
            if(lineIndex == 0){
                colArray = line.split(',')
                startEventCount = false
                colArray.forEach((col,colIndex) => {
                    colLabels.push(col)
                    
                    //get the tempEvents and its index
                    if(colArray[colIndex-1] == 'Gender')
                        startEventCount = true
                    if(colArray[colIndex] == 'Email')
                        startEventCount = false
                       
                    if(startEventCount){
                        tempEvents.push(col)
                        tempEventsLabels.push(colIndex)
                    }
                })
            }
            //get all competitors
            if(lineIndex != dataSplit.length-1){
                lineArray = line.split(',')
                competitors.push(lineArray[1])
            }
        })

        //cycle through all the tempEvents to get the competitors in each event
        tempEvents.forEach((event,eventIndex) => {
            tempCompetitors = []
            dataSplit.forEach((line2,lineIndex2) => {
                //check the column for the current event
                line2Array = line2.split(',')
                if(line2Array[tempEventsLabels[eventIndex]] == '1'){
                    tempCompetitors.push({
                        id: line2Array[3],
                        name: line2Array[1],
                        group: 1,
                        role: "none",
                        notes: ""	
                    })
                }
            })
            events.push({
                name: event,
                grouping: 2, //by default each event will will have 2 groups
                schedule: "",
                competitors: tempCompetitors
            })
        })
        events.forEach((eve,eveIndex) => {
            groupCount = 0
            eve.competitors.forEach((compet,competInd) => {
                groupCount++
                compet.group = groupCount
                if((competInd+1)%eve.grouping == 0)
                    groupCount = 0
            })
        })
        competitionObject.events = events
        loadEvents("edit")
    }

    function loadEvents(mode){
        saveToLocalStorage()
        
        if(!$('#competition_info').is(':visible')){
            $('#competition_info').toggle('fast')
        }
        if(!$('#display_button').is(':visible')){
            $('#display_button').toggle('fast')
        }

        htmlString = ""

        competitionObject.events.forEach((event,eventInd) => {
            htmlString += "<div class='card'>"
                htmlString += "<div class='card-header' style='white-space:nowrap;'>"
                    htmlString += "<div class='col-lg-12 text-center'>"
                        displayedEvent = ""
                        switch (event.name) {
                            case '222':
                                displayedEvent = '2x2'
                                break
                            case '333':
                                displayedEvent = '3x3'
                                break
                            case '444':
                                displayedEvent = '4x4'
                                break
                            case '555':
                                displayedEvent = '5x5'
                                break
                            case '666':
                                displayedEvent = '6x6'
                                break
                            case '777':
                                displayedEvent = '7x7'
                                break
                            case '333bf':
                                displayedEvent = '3x3 Blindfolded'
                                break
                            case '444bf':
                                displayedEvent = '4x4 Blindfolded'
                                break
                            case '555bf':
                                displayedEvent = '5x5 Blindfolded'
                                break
                            case '333fm':
                                displayedEvent = '3x3 Fewest Moves'
                                break
                            case '333oh':
                                displayedEvent = '3x3 One-Handed'
                                break
                            case '333ft':
                                displayedEvent = '3x3 With Feet'
                                break
                            case 'clock':
                                displayedEvent = 'Clock' 
                                break
                            case 'minx':
                                displayedEvent = 'Megaminx'
                                break
                            case 'pyram':
                                displayedEvent = 'Pyraminx'
                                break
                            case 'skewb':
                                displayedEvent = 'Skewb'
                                break
                            case 'sq1':
                                displayedEvent = 'Square-1'
                                break
                            case '333mbf':
                                displayedEvent = '3x3 Multi-Blind'
                                break
                            default:
                                displayedEvent = event.name
                                break

                        }
                        htmlString += "<h2>"+displayedEvent+"</h2>"
                        htmlString += "<p class='lead'>"+event.competitors.length+" Competitors, "+event.grouping+" groups</p>"
                        
                        if(mode == "edit"){
                            htmlString += "<div class='input-group mb-3'>"
                            htmlString += "<input class='form-control' type='number' value='"+event.grouping+"' id='"+event.name+"_grouping'>"
                            htmlString += "<div class='input-group-append'>"
                            htmlString += "<button type='button' class='btn btn-sm btn-outline-secondary change_grouping "+event.name+"_event'>Change Grouping</button>"
                            htmlString += "</div>"
                            htmlString += "</div>"
                        } else {
                            htmlString += "<button type='button' class='btn btn-sm btn-outline-secondary download_table' id='"+event.name+"_download'>Download "+displayedEvent+" Event</button>"
                        }

                    htmlString += "</div>"
                htmlString += "</div>"

                htmlString += "<div class='card-body'><div class='col-lg-12 text-center'>"
                //if(mode == "edit")
                //    htmlString += "<table class='table table-sm'>"
                //else

                htmlString += "<table id='"+event.name+"_table' class='table table-sm'>"
                htmlString += "<thead><tr>"

                for(a=0;a<event.grouping;a++){
                    htmlString += "<th scope='col'>Group "+(a+1)+"</th>"
                }
                htmlString += "</tr></thead>"
                htmlString += "<tbody>"
                
                prepareEvent(event.name,(preparedEvent) => {
                    for(a=0;a<Math.ceil(event.competitors.length/event.grouping);a++){
                        htmlString += "<tr>"
                        for(b=0;b<event.grouping;b++){
                            currCompetitor = preparedEvent[b][a]
                            if(currCompetitor == undefined){
                                htmlString += "<td></td>"
                            }
                            else{
                                htmlString += "<td>"

                                if(currCompetitor.role == 'judge')
                                    htmlString += "<b>"+currCompetitor.name+" (judge)</b><br>"
                                else if(currCompetitor.role == 'runner')
                                    htmlString += "<b>"+currCompetitor.name+" (runner)</b><br>"
                                else if(currCompetitor.role == 'encoder')
                                    htmlString += "<b>"+currCompetitor.name+" (encoder)</b><br>"
                                else
                                    htmlString += currCompetitor.name+"<br>"
                                
                                if(mode == "edit"){
                                    htmlString += "<div class='input-group mb-3'>"

                                    htmlString += "<select class='custom-select change_group' id='"+currCompetitor.name+"_"+event.name+"_change_group'>"
            
                                    for(c=0;c<event.grouping;c++){
                                        if(currCompetitor.group == (c+1))
                                            htmlString += "<option value='"+(c+1)+"' selected>Group "+(c+1)+"</option>"
                                        else
                                            htmlString += "<option value='"+(c+1)+"'>Group "+(c+1)+"</option>"
                                    }

                                    htmlString += "</select>"

                                    htmlString += "<select class='custom-select change_role' id='"+currCompetitor.name+"_"+event.name+"_change_role custom-select'>"

                                    if(currCompetitor.role == '')
                                        htmlString += "<option value='none' selected>None</option>"
                                    else
                                        htmlString += "<option value='none'>None</option>"

                                    if(currCompetitor.role == 'runner')
                                        htmlString += "<option value='runner' selected>Runner</option>"
                                    else
                                        htmlString += "<option value='runner'>Runner</option>"

                                    if(currCompetitor.role == 'judge')
                                        htmlString += "<option value='judge' selected>Judge</option>"
                                    else
                                        htmlString += "<option value='judge'>Judge</option>"
                                    if(currCompetitor.role == 'encoder')
                                        htmlString += "<option value='encoder' selected>Encoder</option>"
                                    else
                                        htmlString += "<option value='encoder'>Encoder</option>"
                                        
                                    htmlString += "</select>"

                                    htmlString += "<div class='input-group-append'>"
                                    htmlString += "<button id='"+currCompetitor.name+"_"+event.name+"_remove' class='btn btn-outline-secondary remove_person' type='button'>Remove</button>"
                                    htmlString += "</div>"
                                    htmlString += " </div>"
                                }

                                htmlString += "</td>"
                            }
                        }
                        htmlString += "</tr>"

                        if(mode == "edit"){
                            if(a+1 == Math.ceil(event.competitors.length/event.grouping)){
                                htmlString += "<tr>"

                                for(d=0;d<event.grouping;d++){
                                    htmlString += "<td>"
                                    htmlString += "<input type='text' id='"+event.name+"_"+(d+1)+"_new_person_name'>"

                                    htmlString += "<div class='btn-group'>"
                                    htmlString += "<select class='form-control' id='"+event.name+"_"+(d+1)+"_new_person_role'>"
                                    htmlString += "<option value='none'>None</option>"
                                    htmlString += "<option value='runner'>Runner</option>"
                                    htmlString += "<option value='judge'>Judge</option>"
                                    htmlString += "<option value='encoder'>Encoder</option>"
                                    htmlString += "</select>"
                                    htmlString += "</div>"

                                    htmlString += "<button type='button' id='"+event.name+"_"+(d+1)+"_new_person' class='btn btn-info btn-sm new_person'>Add Person</button>"
                                    htmlString += "</td>"

                                    htmlString += "</td>"
                                }
                                htmlString += "</tr>"
                            }
                        }
                    }
                })

                htmlString += "</tbody></table>"
                htmlString += "</div>"
                htmlString += "</div>"
            htmlString += "</div>"
            htmlString += "<br>"
        })

        $(".event_area").html(htmlString)
    }

    function prepareEvent(selectedEvent,cb){
        /**
         * This can handle the grouping of events
         * output an array of the number of groups for a specific event
         */

        tempCompetitorArray1 = [] //will hold all competitors with no roles
        tempCompetitorArray2 = [] //will hold all competitors with roles
        finalCompetitorArray = [] //combination of all competitors with roles and with no roles

        competitionObject.events.forEach((event,eventInd) => {
            if(selectedEvent == event.name){
                for(a=0;a<event.grouping;a++){
                    tempCompetitorArray1.push([])
                    tempCompetitorArray2.push([])
                    finalCompetitorArray.push([])
                }
                
                event.competitors.forEach((competitor,competitorInd) => {
                    if(competitor.role == "none"){
                        tempCompetitorArray1[competitor.group-1].push(competitor)
                    } else {
                        tempCompetitorArray2[competitor.group-1].push(competitor)
                    }
                })
                for(b=0;b<event.grouping;b++){
                    tempCompetitorArray1[b].sort(compare)
                    tempCompetitorArray2[b].sort(compare)
                    finalCompetitorArray[b] = tempCompetitorArray2[b].concat(tempCompetitorArray1[b])
                }

            }
        })
        cb(finalCompetitorArray)

        function compare(a,b) {
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        }
    }

    function changeGrouping(eventChosen,groupingChosen){
        competitionObject.events.forEach((event,eventInd) => {
            if(event.name == eventChosen){
                event.grouping = groupingChosen
                groupCount = 0

                event.competitors.forEach((compet,competInd) => {
                    groupCount++
                    compet.group = groupCount

                    if((competInd+1)%groupingChosen == 0)
                        groupCount = 0
                })
            }
        })
        loadEvents("edit")
    }

    function changeUserGroup(event,competitor,newGroup){
        competitionObject.events.forEach((eve,eveInd) => {
            if(eve.name == event){
                eve.competitors.forEach((compet,competInd) => {
                    if(compet.name == competitor){
                        compet.group = newGroup
                    }
                })
            }
        })
        loadEvents("edit")
    }

    function changeUserRole(event,competitor,newRole){
        competitionObject.events.forEach((eve,eveInd) => {
            if(eve.name == event){
                eve.competitors.forEach((compet,competInd) => {
                    if(compet.name == competitor){
                        compet.role = newRole
                    }
                })
            }
        })
        loadEvents("edit")
    }

    function removePerson(event,name){
        competitionObject.events.forEach((eve,eveInd) => {
            if(eve.name == event){
                indexToDelete = -1
                eve.competitors.forEach((compet,competInd) => {
                    if(compet.name == name){
                        indexToDelete = competInd
                    }
                })
                if(indexToDelete > -1){
                    eve.competitors.splice(indexToDelete,1)
                }
            }
        })
        loadEvents("edit")
    }

    function addNewPerson(event,group,name,role){
        competitionObject.events.forEach((eve,eveInd) => {
            if(eve.name == event){
                eve.competitors.push({
                    id: "",
                    name: name,
                    group: group,
                    role: role,
                    notes: ""	
                })
            }
        })
        loadEvents("edit")        
    }

});