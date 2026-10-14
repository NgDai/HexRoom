/**
 * Fetch old address data from v1 API
 * v1 has 63 provinces with old district names (quận/huyện)
 */

export interface OldAddressInfo {
    v1Province: string; // "Thành phố Hà Nội"
    v1District: string; // "Quận Hoàn Kiếm"
}

interface V1Ward {
    name: string;
}

interface V1District {
    name: string;
    wards?: V1Ward[];
}

interface V1Province {
    name: string;
    districts?: V1District[];
}

function normalizeName(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Find old address (v1) by matching ward name
 * v2 ward names usually match v1 ward names
 * We search v1 districts to find which one contains this ward
 */
export async function findOldAddress(
    v2Ward: string,
    v2Province: string
): Promise<OldAddressInfo | null> {
    if (!v2Ward || !v2Province) {
        return null;
    }

    // Fetch v1 data with depth=3 to get wards inside districts
    try {
        const v1Data = await fetch('https://provinces.open-api.vn/api/v1/?depth=3')
            .then((r) => r.json()) as V1Province[];

        if (!Array.isArray(v1Data)) {
            return null;
        }

        const normalizedProvince = normalizeName(v2Province);
        const normalizedWard = normalizeName(v2Ward);

        // Find v1 province by matching name (usually "Thành phố Hà Nội" matches "Hà Nội")
        const matchedV1Province = v1Data.find(
            (p) =>
                normalizeName(p.name).includes(normalizedProvince) ||
                normalizedProvince.includes(normalizeName(p.name))
        );

        if (!matchedV1Province) {
            return null;
        }

        // Search through all districts to find which one has this ward
        for (const district of matchedV1Province.districts || []) {
            const wardList = district.wards || [];
            
            // Try exact match first
            let wardExists = wardList.some(
                (w) => normalizeName(w.name) === normalizedWard
            );
            
            // If not found, try partial match (keywords)
            if (!wardExists) {
                wardExists = wardList.some(
                    (w) =>
                        normalizedWard.includes(normalizeName(w.name)) ||
                        normalizeName(w.name).includes(normalizedWard)
                );
            }

            if (wardExists) {
                const result: OldAddressInfo = {
                    v1Province: matchedV1Province.name,
                    v1District: district.name,
                };
                return result;
            }
        }

        // Ward not found - try matching by district name
        // Example: "Phường Hoàn Kiếm" → "Hoàn Kiếm" → "Quận Hoàn Kiếm"
        
        // Extract district name from ward (remove Phường/Xã/Thị trấn prefix)
        const wardPrefixes = ['Phường', 'Xã', 'Thị trấn'];
        let districtNameCandidate = v2Ward;
        for (const prefix of wardPrefixes) {
            if (districtNameCandidate.startsWith(prefix)) {
                districtNameCandidate = districtNameCandidate.substring(prefix.length).trim();
                break;
            }
        }

        const normalizedDistrictCandidate = normalizeName(districtNameCandidate);

        // Try to find v1 district that contains this name
        const matchedByDistrictName = matchedV1Province.districts?.find(
            (d) =>
                normalizeName(d.name).includes(normalizedDistrictCandidate) ||
                normalizedDistrictCandidate.includes(normalizeName(d.name))
        );

        if (matchedByDistrictName) {
            const result: OldAddressInfo = {
                v1Province: matchedV1Province.name,
                v1District: matchedByDistrictName.name,
            };
            return result;
        }

        return null;
    } catch (error) {
        console.error('Error fetching v1 mapping data:', error);
        return null;
    }
}
