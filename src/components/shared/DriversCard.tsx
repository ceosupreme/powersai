interface DriversCardProps {
  drivers: string;
}

// Helper function to parse drivers into bullet points
const parseDrivers = (drivers: string): string[] => {
  if (!drivers) return [];
  
  // Split by common delimiters: newlines, semicolons, or periods followed by space
  const items = drivers
    .split(/[\n;]|(?<=\.)\s+/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  return items;
};

export const DriversCard = ({ drivers }: DriversCardProps) => {
  const driversList = parseDrivers(drivers);

  return (
    <div className="card-metric p-5">
      <ul className="text-foreground space-y-2">
        {driversList.length > 0 ? (
          driversList.map((driver, index) => (
            <li key={index} className="flex items-start gap-2 leading-relaxed">
              <span className="text-primary mt-0.5">•</span>
              <span>{driver}</span>
            </li>
          ))
        ) : (
          <li className="text-muted-foreground/60">No drivers recorded</li>
        )}
      </ul>
    </div>
  );
};
