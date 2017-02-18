# verify that a log file represents a valid solve
def solve_log_is_valid(puzzle_file, log_file, status):
    log_file = log_file.strip()
    if log_file == '':
        return False
    lines = puzzle_file.split("\n")
    lines[0] = lines[0].replace(",,",",0,")
    lines[1] = lines[1].replace(",,",",0,")
    lines[0] = lines[0].replace(",,",",0,")
    lines[1] = lines[1].replace(",,",",0,")
    if lines[0][-1] == ",":
        lines[0] = lines[0]+"0"
    if lines[1][-1] == ",":
        lines[1] = lines[1]+"0"
    if lines[0][0] == ",":
        lines[0] = "0"+lines[0]
    if lines[1][0] == ",":
        lines[1] = "0"+lines[1]
    print(lines[0])
    print(lines[1])
    left = [[int(y) for y in x.split(" ")] for x in lines[1].split(",")]
    top = [[int(y) for y in x.split(" ")] for x in lines[0].split(",")]
    width = len(left)
    matrix = [x[:] for x in [[False] * width] * width] 

    for line in log_file.split("\n"):
        time,x,y,z = line.split(" ")
        matrix[int(x)][int(y)] = (z == "1")

    inBlock = False
    currentCount = 0
    currentBlock = 0

    # Check that all the left constraints are met
    for row in range(0,width):
        constraints = left[row]
        currentCount = 0
        currentBlock = 0
        inBlock = False
        for col in range(0,width):
            if matrix[row][col] == 1:
                if currentBlock > (len(constraints)-1):
                    return False
                # If we're in a block, keep adding to it
                if currentCount < constraints[currentBlock]:
                    currentCount += 1
                    # If we've gone past the length of the block, exit
                else:
                    return False
                inBlock = True
            else:
                # If we were looking for more blocks, but didn't
                # find any, exit
                if inBlock and (currentCount < constraints[currentBlock]):
                    return False
                # If we just finished a block, then update counters
                elif inBlock and currentCount == constraints[currentBlock]:
                    currentCount = 0
                    currentBlock += 1
                inBlock = False
        if currentBlock < len(constraints):
            # Check to see if the last block ended
            if (currentBlock+1) == len(constraints) and currentCount != constraints[currentBlock]:
                return False
    # Check that all the top constraints are met
    for col in range(0,width):
        constraints = top[col]
        currentCount = 0
        currentBlock = 0
        inBlock = False
        for row in range(0, width):
            if matrix[row][col] == 1:
                if currentBlock > (len(constraints)-1):
                    return False
                # If we're in a block, keep adding to it
                if currentCount < constraints[currentBlock]:
                    currentCount += 1
                # If we've gone past the length of the block, exit
                else:
                    return False
                inBlock = True
            else:
                # If we were looking for more blocks, but didn't
                # find any, exit
                if inBlock and (currentCount < constraints[currentBlock]):
                    return False
                # If we just finished a block, then update counters
                elif inBlock and (currentCount == constraints[currentBlock]):
                    currentCount = 0
                    currentBlock += 1
                inBlock = False
            matrix[row][col] = 0
        if currentBlock < len(constraints):
            # Check to see if the last block ended
            if currentBlock+1 == len(constraints) and (currentCount != constraints[currentBlock]):
                return False
    return True
