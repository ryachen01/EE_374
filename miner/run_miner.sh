CORES=4

for ((i=0; i < 10; i++)) {

# Array to store PIDs of Node.js instances
pids=()

# Run Node.js program on each core/thread for 30 seconds
for ((j=0; j<$CORES; j++))
do
  node miner.js &
  pids+=($!)
done

sleep 10

# Stop each instance of the Node.js program
for pid in "${pids[@]}"
do
  kill $pid
done

}