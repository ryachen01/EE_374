
for ((i=0; i < 10000; i++)) {

# Array to store PIDs of Node.js instances
pids=()

# Run Node.js program on each core/thread for 30 seconds
./b2sMiner &
pids+=($!)

sleep 30

# Stop each instance of the Node.js program
for pid in "${pids[@]}"
do
  kill $pid
done

}
