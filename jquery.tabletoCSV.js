jQuery.fn.tableToCSV = function(compData) {
    var clean_text = function(text){
        text = text.replace(/"/g, '""');
        return '"'+text+'"';
    };
    
	$(this).each(function(){
			var table = $(this);
			var name = table[0].attributes.id.value.split('_')[0]
			var heading = [];
			var title = [];
			var rows = [];
			
			$(this).find('tr').each(function(){
				var data = [];
				$(this).find('th').each(function(){
                    var text = clean_text($(this).text());
					title.push(text);
					});
				$(this).find('td').each(function(){
                    var text = clean_text($(this).text());
					data.push(text);
					});
				data = data.join(",");
				rows.push(data);
			});
			heading.push(compData.name)
			heading.push(name + " event")
			heading.push(compData.date)
			heading.push(compData.days + " days")
			heading.push(compData.venue)

			header = heading.join("\n")
			header += "\n\n"
			title = title.join(",");
			rows = rows.join("\n");

			var csv = header + title + rows;

			var uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
			var download_link = document.createElement('a');
			download_link.href = uri;
			download_link.download = name+".csv";
			document.body.appendChild(download_link);
			download_link.click();
			document.body.removeChild(download_link);
	});
    
};
